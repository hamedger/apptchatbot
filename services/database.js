const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './data/appointments.db';
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      return new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            logger.error('Database connection error:', err);
            reject(err);
            return;
          }

          logger.info('Database connected successfully');
          this.setupTables()
            .then(() => {
              this.initialized = true;
              resolve();
            })
            .catch(reject);
        });
      });
    } catch (error) {
      logger.error('Database initialization error:', error);
      throw error;
    }
  }

  async setupTables() {
    const createTables = `
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        user TEXT NOT NULL,
        slot TEXT NOT NULL,
        worker TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        rooms TEXT NOT NULL,
        hallways TEXT NOT NULL,
        stairways TEXT NOT NULL,
        petIssue TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        step TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user);
      CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(createTables, (err) => {
        if (err) {
          logger.error('Error creating tables:', err);
          reject(err);
          return;
        }
        logger.info('Database tables created/verified');
        
        // Run migration to update existing schema if needed
        this.migrateSchema().then(() => {
          resolve();
        }).catch((migrationErr) => {
          logger.error('Migration error:', migrationErr);
          resolve(); // Continue even if migration fails
        });
      });
    });
  }

  async migrateSchema() {
    try {
      // First check if appointments table exists
      const tableExists = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'");
      if (tableExists.length === 0) {
        logger.info('Appointments table does not exist yet, will be created by setupTables');
        return;
      }
      
      // Check current table structure
      const tableInfo = await this.query("PRAGMA table_info(appointments)");
      logger.info('Current table structure:', tableInfo.map(col => col.name));
      
      const hasAreas = tableInfo.some(col => col.name === 'areas');
      const hasRooms = tableInfo.some(col => col.name === 'rooms');
      const hasHallways = tableInfo.some(col => col.name === 'hallways');
      const hasStairways = tableInfo.some(col => col.name === 'stairways');
      
      // If we already have the new columns, no migration needed
      if (hasRooms && hasHallways && hasStairways) {
        logger.info('Database already has new schema, no migration needed');
        return;
      }
      
      logger.info('Starting database migration...');
      
      // Add new columns if they don't exist
      if (!hasRooms) {
        try {
          await this.run("ALTER TABLE appointments ADD COLUMN rooms TEXT DEFAULT 'N/A'");
          logger.info('Added rooms column');
        } catch (colError) {
          logger.warn('Could not add rooms column:', colError.message);
        }
      }
      
      if (!hasHallways) {
        try {
          await this.run("ALTER TABLE appointments ADD COLUMN hallways TEXT DEFAULT 'N/A'");
          logger.info('Added hallways column');
        } catch (colError) {
          logger.warn('Could not add hallways column:', colError.message);
        }
      }
      
      if (!hasStairways) {
        try {
          await this.run("ALTER TABLE appointments ADD COLUMN stairways TEXT DEFAULT 'N/A'");
          logger.info('Added stairways column');
        } catch (colError) {
          logger.warn('Could not add stairways column:', colError.message);
        }
      }
      
      // If old areas column exists, copy data to rooms
      if (hasAreas && hasRooms) {
        try {
          await this.run("UPDATE appointments SET rooms = areas WHERE rooms = 'N/A' OR rooms IS NULL");
          logger.info('Copied areas data to rooms column');
        } catch (copyError) {
          logger.warn('Could not copy areas data:', copyError.message);
        }
      }
      
      // Set default values for any NULL entries (only if columns exist)
      if (hasRooms) {
        try {
          await this.run("UPDATE appointments SET rooms = 'N/A' WHERE rooms IS NULL");
        } catch (updateError) {
          logger.warn('Could not update rooms defaults:', updateError.message);
        }
      }
      
      if (hasHallways) {
        try {
          await this.run("UPDATE appointments SET hallways = 'N/A' WHERE hallways IS NULL");
        } catch (updateError) {
          logger.warn('Could not update hallways defaults:', updateError.message);
        }
      }
      
      if (hasStairways) {
        try {
          await this.run("UPDATE appointments SET stairways = 'N/A' WHERE stairways IS NULL");
        } catch (updateError) {
          logger.warn('Could not update stairways defaults:', updateError.message);
        }
      }
      
      logger.info('Database migration completed successfully');
      
    } catch (error) {
      logger.error('Migration failed:', error);
      // Don't throw error, just log it and continue
      // This prevents the app from crashing if migration fails
    }
  }

  async query(sql, params = []) {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async run(sql, params = []) {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', err);
          reject(err);
          return;
        }
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', err);
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            logger.error('Database close error:', err);
          }
          this.initialized = false;
          resolve();
        });
      });
    }
  }

  // Migration from JSON to SQLite
  async migrateFromJSON(jsonPath) {
    try {
      const jsonData = await fs.readFile(jsonPath, 'utf-8');
      const appointments = JSON.parse(jsonData);

      logger.info(`Migrating ${appointments.length} appointments from JSON`);

      for (const appointment of appointments) {
        await this.run(`
          INSERT OR REPLACE INTO appointments 
          (id, user, slot, worker, name, phone, email, address, areas, petIssue, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          appointment.user || `migrated_${Date.now()}`,
          appointment.user || 'unknown',
          appointment.slot || 'unknown',
          appointment.worker || 'unassigned',
          appointment.name || 'unknown',
          appointment.phone || 'unknown',
          appointment.email || 'unknown',
          appointment.address || 'unknown',
          appointment.areas || 'unknown',
          appointment.petIssue || 'unknown',
          'confirmed'
        ]);
      }

      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Migration error:', error);
      throw error;
    }
  }
}

module.exports = new Database();
