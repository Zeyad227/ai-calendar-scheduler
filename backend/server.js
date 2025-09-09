const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const connectDB = require('./src/config/database');

// Route imports
const authRoutes = require('./src/routes/auth');
const chatRoutes = require('./src/routes/chat');
const eventRoutes = require('./src/routes/events');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    app: 'AI-Powered Calendar Scheduler',
    message: 'Backend API is running',
    version: '1.0.0',
    features: [
      'Natural Language Processing with Groq AI',
      'Google Calendar Integration',
      'JWT Authentication',
      'MongoDB Database',
      'Chat-based Scheduling Interface'
    ],
    endpoints: {
      auth: '/api/auth',
      chat: '/api/chat',
      events: '/api/events',
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'connected',
    services: {
      groq: process.env.GROQ_API_KEY ? 'configured' : 'not configured',
      google: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
      mongodb: 'connected',
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/events', eventRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/chat/schedule',
      'GET /api/events',
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      messages: errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field} already exists`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log('\n🚀 AI-Powered Calendar Scheduler Backend');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📅 Events API: http://localhost:${PORT}/api/events`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('\n✨ Features:');
  console.log('  • Groq AI for natural language processing');
  console.log('  • Google Calendar integration');
  console.log('  • JWT authentication');
  console.log('  • MongoDB database');
  console.log('  • Chat-based scheduling\n');
});

module.exports = app;
