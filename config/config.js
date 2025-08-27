const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/moodlog',
  JWT_SECRET: process.env.JWT_SECRET || 'moodlog-jwt-secret-key-2024-development-only',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'moodlog-refresh-secret-key-2024-development-only',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  AUTH_RATE_LIMIT: 5,
  API_RATE_LIMIT: 100,
  BCRYPT_ROUNDS: 12,
  MAX_REQUEST_SIZE: '10mb',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};

module.exports = config;