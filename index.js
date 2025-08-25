const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const config = require('./config/config');
const connectDB = require('./config/database');
const { corsOptions, apiLimiter, validateInput } = require('./middleware/security');

connectDB();

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use('/api/', apiLimiter);
app.use(express.json({ limit: config.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));
app.use(validateInput);

const authRoutes = require('./routes/auth');
const journalRoutes = require('./routes/journal');
const storyRoutes = require('./routes/stories');

app.use('/api/auth', authRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/stories', storyRoutes);


app.get('/', (req, res) => {
  res.json({ 
    message: 'Mental Health Journal API',
    status: 'running'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: 'Validation Error',
      code: 'VALIDATION_ERROR',
      errors
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate field value',
      code: 'DUPLICATE_ERROR'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  res.status(err.status || 500).json({
    message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  });
});



const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
