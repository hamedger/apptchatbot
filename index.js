
// server.js - entrypoint
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
require('dotenv').config();

// Import services
const logger = require('./services/logger');
const database = require('./services/database');
const authService = require('./services/auth');

// Import routes
const whatsappRouter = require('./routes/whatsapp');
const appointmentsRouter = require('./routes/appointments');
const authRouter = require('./routes/auth');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));


// CORS configuration
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


// Body parsing middleware
// Important: Twilio webhooks use application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300, // limit each IP to 300 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Slow down responses for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes, then...
  delayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS) || 500 // begin adding 500ms of delay per request above 100
});

app.use(limiter);
app.use(speedLimiter);

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/whatsapp', whatsappRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/auth', authRouter);

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} was not found on this server.`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : error.message,
    ...(isProduction ? {} : { stack: error.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connection
    await database.close();
    logger.info('Database connection closed');
    
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Initialize application
const initializeApp = async () => {
  try {
    logger.info('Starting Arlington WhatsApp Bot...');
    
    // Initialize database
    await database.initialize();
    logger.info('Database initialized successfully');
    
    // Migrate existing JSON data if it exists
    const jsonPath = './data/appointments.json';
    const fs = require('fs');
    if (fs.existsSync(jsonPath)) {
      await database.migrateFromJSON(jsonPath);
      logger.info('Data migration completed');
    }
    
    // Initialize default admin user
    await authService.initializeDefaultAdmin();
    logger.info('Authentication service initialized');
    
    // Start server
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';
    
    const server = app.listen(port, host, () => {
      logger.info(`🚀 Server running on http://${host}:${port}`);
      logger.info(`📱 WhatsApp webhook: http://${host}:${port}/whatsapp`);
      logger.info(`🔐 Auth API: http://${host}:${port}/api/auth`);
      logger.info(`📅 Appointments API: http://${host}:${port}/api/appointments`);
      logger.info(`🏥 Health check: http://${host}:${port}/healthz`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 Development mode enabled');
        logger.warn('⚠️  Default admin user: admin / admin123 - CHANGE THIS IMMEDIATELY!');
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application
initializeApp();
