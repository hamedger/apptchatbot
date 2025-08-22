const authService = require('../services/authService');
const logger = require('../services/logger');

/**
 * Middleware to verify JWT token
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    try {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      logger.warn(`Invalid token attempt: ${error.message}`);
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Your session has expired. Please log in again.'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn(`Unauthorized access attempt by user ${req.user.username} to admin resource`);
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
};

/**
 * Middleware to check if user has specific role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.username} to role-restricted resource`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't fail the request
        logger.debug(`Optional auth failed: ${error.message}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (req, res, next) => {
  try {
    // This would typically integrate with a rate limiting service
    // For now, we'll use a simple in-memory approach
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Ensure req.app.locals exists
    if (!req.app.locals) {
      req.app.locals = {};
    }
    
    // Initialize authAttempts if it doesn't exist
    if (!req.app.locals.authAttempts) {
      req.app.locals.authAttempts = new Map();
    }

    const attempts = req.app.locals.authAttempts.get(clientIP) || [];
    const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);

    if (recentAttempts.length >= 5) {
      logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Too many authentication attempts. Please try again later.'
      });
    }

    recentAttempts.push(now);
    req.app.locals.authAttempts.set(clientIP, recentAttempts);

    next();
  } catch (error) {
    logger.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request to proceed
    next();
  }
};

/**
 * Log authentication attempts
 */
const logAuthAttempt = (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    logger.info(`Authentication attempt from IP: ${clientIP}, User-Agent: ${userAgent}`);
    
    next();
  } catch (error) {
    logger.error('Log auth attempt error:', error);
    // If logging fails, allow the request to proceed
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  optionalAuth,
  authRateLimit,
  logAuthAttempt
};
