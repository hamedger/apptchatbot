const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for production logs
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Development format (more readable)
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { 
    service: 'arlington-whatsapp-bot',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: parseInt(process.env.LOG_MAX_SIZE) || 20 * 1024 * 1024, // 20MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14, // 14 days
      tailable: true
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: parseInt(process.env.LOG_MAX_SIZE) || 20 * 1024 * 1024,
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 30
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: parseInt(process.env.LOG_MAX_SIZE) || 20 * 1024 * 1024,
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 30
    })
  ],
  
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: parseInt(process.env.LOG_MAX_SIZE) || 20 * 1024 * 1024,
      maxFiles: parseInt(process.env.LOG_MAX_SIZE) || 30
    })
  ]
});

// Add request logging middleware
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = logger;
