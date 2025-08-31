const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

class AuthController {
  async register(req, res) {
    try {
      const { username, password, displayName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          message: 'Username and password are required',
          code: 'MISSING_FIELDS'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          message: 'Password must be at least 6 characters long',
          code: 'PASSWORD_TOO_SHORT'
        });
      }

      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ 
          message: 'Username must be between 3 and 20 characters',
          code: 'INVALID_USERNAME_LENGTH'
        });
      }

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Username already exists',
          code: 'USERNAME_EXISTS'
        });
      }

      const user = new User({
        username,
        password,
        displayName: displayName || username
      });

      await user.save();

      let token, refreshToken;
      try {
        token = generateToken(user._id);
        refreshToken = generateRefreshToken();
      } catch (tokenError) {
        await User.findByIdAndDelete(user._id);
        console.error('Token generation error:', tokenError);
        return res.status(500).json({ 
          message: 'Registration failed - token generation error',
          code: 'TOKEN_GENERATION_ERROR'
        });
      }

      // Use atomic update to avoid VersionError
      await User.findByIdAndUpdate(
        user._id,
        {
          $push: { refreshTokens: { token: refreshToken, createdAt: new Date() } },
          $set: { lastLogin: new Date() }
        }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          createdAt: user.createdAt
        },
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'Username already exists',
          code: 'USERNAME_EXISTS'
        });
      }
      res.status(500).json({ 
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }

  async registerAnonymous(req, res) {
    try {
      const { password, displayName } = req.body;

      if (!password) {
        return res.status(400).json({ 
          message: 'Password is required',
          code: 'MISSING_PASSWORD'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          message: 'Password must be at least 6 characters long',
          code: 'PASSWORD_TOO_SHORT'
        });
      }

      let username;
      let attempts = 0;
      do {
        username = User.generateAnonymousUsername();
        attempts++;
        if (attempts > 10) {
          return res.status(500).json({ 
            message: 'Unable to generate unique username',
            code: 'USERNAME_GENERATION_FAILED'
          });
        }
      } while (await User.findOne({ username }));

      const user = new User({
        username,
        password,
        displayName: displayName || username
      });

      await user.save();

      let token, refreshToken;
      try {
        token = generateToken(user._id);
        refreshToken = generateRefreshToken();
      } catch (tokenError) {
        await User.findByIdAndDelete(user._id);
        console.error('Token generation error:', tokenError);
        return res.status(500).json({ 
          message: 'Registration failed - token generation error',
          code: 'TOKEN_GENERATION_ERROR'
        });
      }

      // Use atomic update to avoid VersionError
      await User.findByIdAndUpdate(
        user._id,
        {
          $push: { refreshTokens: { token: refreshToken, createdAt: new Date() } }
        }
      );

      res.status(201).json({
        message: 'Anonymous account created successfully',
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          createdAt: user.createdAt
        },
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Anonymous registration error:', error);
      res.status(500).json({ 
        message: 'Registration failed',
        code: 'ANONYMOUS_REGISTRATION_ERROR'
      });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          message: 'Username and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      let token, refreshToken;
      try {
        token = generateToken(user._id);
        refreshToken = generateRefreshToken();
      } catch (tokenError) {
        console.error('Token generation error:', tokenError);
        return res.status(500).json({ 
          message: 'Login failed - token generation error',
          code: 'TOKEN_GENERATION_ERROR'
        });
      }

      // Use atomic update to avoid VersionError
      await User.findByIdAndUpdate(
        user._id,
        {
          $push: { refreshTokens: { token: refreshToken, createdAt: new Date() } },
          $set: { lastLogin: new Date() }
        }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const decoded = verifyRefreshToken(refreshToken);
      
      // Use atomic update to avoid VersionError
      const newRefreshToken = generateRefreshToken();
      const newToken = generateToken(decoded.userId);

      const result = await User.findOneAndUpdate(
        { 'refreshTokens.token': refreshToken },
        {
          $pull: { refreshTokens: { token: refreshToken } },
          $push: { refreshTokens: { token: newRefreshToken, createdAt: new Date() } }
        },
        { new: true, runValidators: true }
      );

      if (!result) {
        return res.status(401).json({ 
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      res.json({
        message: 'Token refreshed successfully',
        token: newToken,
        refreshToken: newRefreshToken
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
      res.status(500).json({ 
        message: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      });
    }
  }

  async getProfile(req, res) {
    try {
      res.json({
        user: {
          id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          createdAt: req.user.createdAt,
          lastLogin: req.user.lastLogin
        }
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch profile',
        code: 'PROFILE_FETCH_ERROR'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { displayName } = req.body;

      if (displayName && displayName.trim().length > 0) {
        if (displayName.trim().length > 30) {
          return res.status(400).json({ 
            message: 'Display name must be 30 characters or less',
            code: 'DISPLAY_NAME_TOO_LONG'
          });
        }
        req.user.displayName = displayName.trim();
        await req.user.save();
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          createdAt: req.user.createdAt,
          lastLogin: req.user.lastLogin
        }
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ 
        message: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Use atomic update to avoid VersionError
        await User.findByIdAndUpdate(
          req.user._id,
          { $pull: { refreshTokens: { token: refreshToken } } }
        );
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        message: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  }
}

module.exports = new AuthController();