const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Anonymous user - no personal information required
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // Optional: user can provide a display name
  displayName: {
    type: String,
    trim: true,
    maxlength: 30
  },
  // Track when user joined
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Track last login
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Store refresh tokens for session management
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate anonymous username
userSchema.statics.generateAnonymousUsername = function() {
  const adjectives = ['Happy', 'Calm', 'Peaceful', 'Hopeful', 'Brave', 'Strong', 'Gentle', 'Wise'];
  const nouns = ['Soul', 'Heart', 'Spirit', 'Mind', 'Dreamer', 'Warrior', 'Friend', 'Traveler'];
  const randomNum = Math.floor(Math.random() * 1000);
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${randomNum}`;
};

module.exports = mongoose.model('User', userSchema);
