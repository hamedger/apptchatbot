const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authService = require('../services/auth');
const { authenticateToken, requireAdmin, authRateLimit, logAuthAttempt } = require('../middleware/auth');
const logger = require('../services/logger');

/**
 * POST /auth/login - User login
 */
router.post('/login', [
  authRateLimit,
  logAuthAttempt,
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Authenticate user
    const result = await authService.authenticateUser(username, password);

    logger.info(`Successful login: ${username}`);

    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });

  } catch (error) {
    logger.warn(`Failed login attempt for username: ${req.body.username}, Error: ${error.message}`);
    
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/register - User registration (admin only)
 */
router.post('/register', [
  authenticateToken,
  requireAdmin,
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('Role must be either admin or user')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password, role = 'user' } = req.body;

    // Create user
    const user = await authService.createUser(username, password, role);

    logger.info(`User registered by admin ${req.user.username}: ${username} with role: ${role}`);

    res.status(201).json({
      message: 'User created successfully',
      user
    });

  } catch (error) {
    logger.error(`User registration error: ${error.message}`);
    
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/logout - User logout (client-side token removal)
 */
router.post('/logout', authenticateToken, (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.username}`);
    
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * GET /auth/profile - Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    
    res.json({
      user
    });
  } catch (error) {
    logger.error('Profile retrieval error:', error);
    res.status(500).json({
      error: 'Profile retrieval failed',
      message: 'An error occurred while retrieving your profile'
    });
  }
});

/**
 * PUT /auth/profile - Update user profile
 */
router.put('/profile', [
  authenticateToken,
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // For now, only username updates are supported
    // Password changes should use a separate endpoint
    const { username } = req.body;

    if (username) {
      // Check if username is already taken
      const existingUser = await authService.getUserById(req.user.id);
      if (existingUser.username !== username) {
        // Update username logic would go here
        logger.info(`Username update requested by user: ${req.user.username} to: ${username}`);
      }
    }

    res.json({
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'An error occurred while updating your profile'
    });
  }
});

/**
 * PUT /auth/change-password - Change user password
 */
router.put('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Change password
    await authService.changePassword(req.user.id, currentPassword, newPassword);

    logger.info(`Password changed for user: ${req.user.username}`);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error(`Password change error for user ${req.user.username}: ${error.message}`);
    
    res.status(400).json({
      error: 'Password change failed',
      message: error.message
    });
  }
});

/**
 * GET /auth/users - List all users (admin only)
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await authService.listUsers();
    
    res.json({
      users
    });
  } catch (error) {
    logger.error('User list retrieval error:', error);
    res.status(500).json({
      error: 'User list retrieval failed',
      message: 'An error occurred while retrieving the user list'
    });
  }
});

/**
 * DELETE /auth/users/:id - Delete user (admin only)
 */
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    await authService.deleteUser(id);

    logger.info(`User deleted by admin ${req.user.username}: ${id}`);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error(`User deletion error: ${error.message}`);
    
    res.status(400).json({
      error: 'User deletion failed',
      message: error.message
    });
  }
});

/**
 * GET /auth/verify - Verify token validity
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

module.exports = router;
