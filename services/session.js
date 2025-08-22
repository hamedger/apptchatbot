// services/session.js
const fs = require('fs').promises;
const path = require('path');

const SESSIONS_PATH = path.join(__dirname, '../data/sessions.json');

// In-memory cache for performance
const userSessions = {};

/**
 * Load sessions from file
 */
async function loadSessions() {
  try {
    const data = await fs.readFile(SESSIONS_PATH, 'utf-8');
    const sessions = JSON.parse(data || '{}');
    Object.assign(userSessions, sessions);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error loading sessions:', err);
    }
    // If file doesn't exist, start with empty sessions
  }
}

/**
 * Save sessions to file
 */
async function saveSessions() {
  try {
    await fs.writeFile(SESSIONS_PATH, JSON.stringify(userSessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

/**
 * Get the session object for a user.
 * If not found, initializes a new session starting with step "name".
 * @param {string} user - WhatsApp user ID or phone number
 * @returns {object} - session object { step, name?, phone?, etc. }
 */
function getSession(user) {
  // Normalize the user key to handle different formats consistently
  // Remove whatsapp: prefix and normalize phone number
  let normalizedUser = user;
  if (user.startsWith('whatsapp:')) {
    normalizedUser = user.substring(9); // Remove 'whatsapp:' prefix
  }
  // Remove any + and normalize
  normalizedUser = normalizedUser.replace(/\+/g, '').trim();
  
  if (!userSessions[normalizedUser]) {
    userSessions[normalizedUser] = {
      step: 'name',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    // Save new session
    saveSessions();
  }
  return userSessions[normalizedUser];
}

/**
 * Update a user's session.
 * @param {string} user - WhatsApp user ID or phone number
 * @param {string} key - The key to update (e.g. 'name', 'step')
 * @param {string} value - Value to store
 */
function updateSession(user, key, value) {
  const session = getSession(user);
  if (key && value !== undefined) {
    session[key] = value;
    session.lastActivity = new Date().toISOString();
    // Save updated session
    saveSessions();
  }
}

/**
 * Clears the user's session.
 * @param {string} user - WhatsApp user ID or phone number
 */
function clearSession(user) {
  // Normalize the user key to handle different formats consistently
  // Remove whatsapp: prefix and normalize phone number
  let normalizedUser = user;
  if (user.startsWith('whatsapp:')) {
    normalizedUser = user.substring(9); // Remove 'whatsapp:' prefix
  }
  // Remove any + and normalize
  normalizedUser = normalizedUser.replace(/\+/g, '').trim();
  
  delete userSessions[normalizedUser];
  // Save updated sessions
  saveSessions();
}

/**
 * Get all active sessions (for admin purposes)
 */
function getAllSessions() {
  return userSessions;
}

/**
 * Clean up old sessions (older than 24 hours)
 */
async function cleanupOldSessions() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  let cleaned = 0;
  for (const [user, session] of Object.entries(userSessions)) {
    if (new Date(session.lastActivity) < oneDayAgo) {
      delete userSessions[user];
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    await saveSessions();
    console.log(`🧹 Cleaned up ${cleaned} old sessions`);
  }
}

// Load sessions on startup
loadSessions();

// Clean up old sessions every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

module.exports = {
  getSession,
  updateSession,
  clearSession,
  getAllSessions,
  cleanupOldSessions
};
