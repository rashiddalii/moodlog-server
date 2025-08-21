const express = require('express');
const User = require('../models/User');
const { authenticateToken, generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    // Validation
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

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }

    // Create new user
    const user = new User({
      username,
      password,
      displayName: displayName || username
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

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
});

// Quick anonymous registration (generates random username)
router.post('/register-anonymous', async (req, res) => {
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

    // Generate unique anonymous username
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

    // Create new user
    const user = new User({
      username,
      password,
      displayName: displayName || username
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

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
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

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
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        message: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user with this refresh token
    const user = await User.findOne({
      'refreshTokens.token': refreshToken
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken();

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

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
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
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
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
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
});

// Logout (remove refresh token)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove the specific refresh token
      req.user.refreshTokens = req.user.refreshTokens.filter(
        rt => rt.token !== refreshToken
      );
      await req.user.save();
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

module.exports = router;
