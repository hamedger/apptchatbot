const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');
const logger = require('./logger');

class AuthService {
  constructor() {
    this.jwtSecret = null;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    this.jwtSecret = process.env.JWT_SECRET;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    this.initialized = true;
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.bcryptRounds);
    } catch (error) {
      logger.error('Password hashing error:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare a password with its hash
   */
  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password comparison error:', error);
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    try {
      if (!this.initialized) {
        throw new Error('Auth service not initialized');
      }
      
      const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
        iat: Date.now()
      };

      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn
      });
    } catch (error) {
      logger.error('Token generation error:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      if (!this.initialized) {
        throw new Error('Auth service not initialized');
      }
      
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      logger.error('Token verification error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Create a new user
   */
  async createUser(username, password, role = 'admin') {
    try {
      // Check if user already exists
      const existingUser = await database.get(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);
      const userId = uuidv4();

      // Insert user
      await database.run(
        'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
        [userId, username, passwordHash, role]
      );

      logger.info(`User created: ${username} with role: ${role}`);

      return {
        id: userId,
        username,
        role
      };
    } catch (error) {
      logger.error('User creation error:', error);
      throw error;
    }
  }

  /**
   * Authenticate a user
   */
  async authenticateUser(username, password) {
    try {
      // Get user with password hash
      const user = await database.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await database.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Generate token
      const token = this.generateToken(user);

      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        token
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Initialize default admin user
   */
  async initializeDefaultAdmin() {
    try {
      const adminExists = await database.get(
        'SELECT id FROM users WHERE role = ?',
        ['admin']
      );

      if (!adminExists) {
        const defaultPassword = 'admin123'; // Change this in production!
        await this.createUser('admin', defaultPassword, 'admin');
        logger.warn('Default admin user created with password: admin123 - CHANGE THIS IMMEDIATELY!');
      }
    } catch (error) {
      logger.error('Default admin initialization error:', error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await database.get(
        'SELECT id, username, role, created_at, last_login FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current user with password hash
      const user = await database.get(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidCurrentPassword = await this.comparePassword(currentPassword, user.password_hash);
      if (!isValidCurrentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await database.run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      logger.info(`Password changed for user ID: ${userId}`);
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * List all users (admin only)
   */
  async listUsers() {
    try {
      const users = await database.query(
        'SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC'
      );

      return users;
    } catch (error) {
      logger.error('List users error:', error);
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId) {
    try {
      const result = await database.run(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      if (result.changes === 0) {
        throw new Error('User not found');
      }

      logger.info(`User deleted: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Delete user error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
