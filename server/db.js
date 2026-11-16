/**
 * QUANTUM-SAFE Database Layer
 * Dual-engine database adapter supporting MongoDB (via Mongoose)
 * with SQLite (via node:sqlite) zero-dependency embedded persistence.
 */

try { require('dotenv').config(); } catch {}

let DatabaseSync = null;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  DatabaseSync = null;
}

const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { MongoAdapter, connectMongo } = require('./db-mongo');

// Read environment variables if available
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quantum_safe';

let sqliteDb = null;
let sqliteStatements = {};

if (DatabaseSync) {
  try {
    const DATA_DIR = path.join(__dirname, 'data');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const DB_PATH = path.join(DATA_DIR, 'quantum_safe.db');
    sqliteDb = new DatabaseSync(DB_PATH);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA synchronous = NORMAL;');
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT DEFAULT 'Security Analyst',
        organization TEXT DEFAULT 'Quantum-Safe Network',
        pqc_algorithm TEXT DEFAULT 'ML-KEM-768 (NIST FIPS 203)',
        pqc_public_key TEXT,
        pqc_fingerprint TEXT,
        avatar_initials TEXT,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        category TEXT NOT NULL,
        event TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT NOT NULL,
        actor TEXT NOT NULL,
        badge_class TEXT DEFAULT 'badge-teal',
        ip_address TEXT,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        text TEXT NOT NULL,
        ciphertext TEXT,
        nonce TEXT,
        auth_tag TEXT,
        pqc_session_key_id TEXT,
        read INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
    `);

    sqliteStatements = {
      findUserByEmail: sqliteDb.prepare('SELECT * FROM users WHERE email = ?'),
      findUserById: sqliteDb.prepare('SELECT * FROM users WHERE id = ?'),
      insertUser: sqliteDb.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, salt, role, organization,
          pqc_algorithm, pqc_public_key, pqc_fingerprint, avatar_initials,
          created_at, last_login_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `),
      updateLastLogin: sqliteDb.prepare('UPDATE users SET last_login_at = ? WHERE id = ?'),
      updateProfile: sqliteDb.prepare('UPDATE users SET name = ?, organization = ?, role = ? WHERE id = ?'),
      insertLog: sqliteDb.prepare(`
        INSERT INTO audit_logs (
          id, user_id, category, event, details, status, actor, badge_class, ip_address, timestamp
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `),
      getLogs: sqliteDb.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'),
      getAllUsers: sqliteDb.prepare('SELECT id, name, email, role, organization, pqc_fingerprint, avatar_initials, created_at FROM users WHERE id != ?'),
      insertMessage: sqliteDb.prepare(`
        INSERT INTO messages (
          id, sender_id, receiver_id, text, ciphertext, nonce, auth_tag, pqc_session_key_id, read, timestamp
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `),
      getConversation: sqliteDb.prepare(`
        SELECT id, sender_id AS senderId, receiver_id AS receiverId, text, ciphertext, nonce, auth_tag AS authTag, pqc_session_key_id AS pqcSessionKeyId, read, timestamp
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp ASC
      `),
      countMessages: sqliteDb.prepare('SELECT COUNT(*) AS count FROM messages'),
      markMessagesAsRead: sqliteDb.prepare('UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0')
    };
  } catch (err) {
    sqliteDb = null;
    sqliteStatements = {};
  }
}

// Attempt to connect to MongoDB if configured
connectMongo().catch(err => {
  console.warn('[MongoDB] Initialization error:', err.message);
});

const DB = {
  isMongoActive() {
    return MongoAdapter.isConnected();
  },

  async findUserByEmail(email) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.findUserByEmail(email);
    }
    if (!email || !sqliteStatements.findUserByEmail) return null;
    return sqliteStatements.findUserByEmail.get(email.trim().toLowerCase()) || null;
  },

  async findUserById(id) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.findUserById(id);
    }
    if (!id || !sqliteStatements.findUserById) return null;
    return sqliteStatements.findUserById.get(id) || null;
  },

  async createUser(userData) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.createUser(userData);
    }
    if (!sqliteStatements.insertUser) return null;

    const {
      id,
      name,
      email,
      passwordHash,
      salt,
      role = 'Security Analyst',
      organization = 'Quantum-Safe Network',
      pqcAlgorithm = 'ML-KEM-768 (NIST FIPS 203)',
      pqcPublicKey = '',
      pqcFingerprint = '',
      avatarInitials = 'QS',
      createdAt = Date.now(),
      lastLoginAt = Date.now()
    } = userData;

    sqliteStatements.insertUser.run(
      id,
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      salt,
      role,
      organization,
      pqcAlgorithm,
      pqcPublicKey,
      pqcFingerprint,
      avatarInitials,
      createdAt,
      lastLoginAt
    );

    return await this.findUserById(id);
  },

  async updateUserLoginTime(id, timestamp = Date.now()) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.updateUserLoginTime(id, timestamp);
    }
    if (sqliteStatements.updateLastLogin) {
      sqliteStatements.updateLastLogin.run(timestamp, id);
    }
  },

  async updateUserProfile(id, { name, organization, role }) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.updateUserProfile(id, { name, organization, role });
    }
    if (sqliteStatements.updateProfile) {
      sqliteStatements.updateProfile.run(name, organization, role, id);
    }
    return await this.findUserById(id);
  },

  async createAuditLog({
    id,
    userId = null,
    category = 'AUTH',
    event,
    details,
    status = 'SUCCESS',
    actor = 'System',
    badgeClass = 'badge-teal',
    ipAddress = '127.0.0.1',
    timestamp = Date.now()
  }) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.createAuditLog({
        id,
        userId,
        category,
        event,
        details,
        status,
        actor,
        badgeClass,
        ipAddress,
        timestamp
      });
    }

    if (sqliteStatements.insertLog) {
      sqliteStatements.insertLog.run(
        id,
        userId,
        category,
        event,
        details,
        status,
        actor,
        badgeClass,
        ipAddress,
        timestamp
      );
    }
  },

  async getAuditLogs(limit = 50) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.getAuditLogs(limit);
    }
    if (!sqliteStatements.getLogs) return [];
    return sqliteStatements.getLogs.all(limit) || [];
  },

  async getAllUsers(excludeId = null) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.getAllUsers(excludeId);
    }
    if (!sqliteStatements.getAllUsers) return [];
    return sqliteStatements.getAllUsers.all(excludeId || '') || [];
  },

  async createMessage(data) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.createMessage(data);
    }
    const id = data.id || crypto.randomUUID();
    const timestamp = data.timestamp || Date.now();
    if (sqliteStatements.insertMessage) {
      sqliteStatements.insertMessage.run(
        id,
        data.senderId,
        data.receiverId,
        data.text,
        data.ciphertext || '',
        data.nonce || '',
        data.authTag || '',
        data.pqcSessionKeyId || '',
        0,
        timestamp
      );
    }
    return {
      id,
      senderId: data.senderId,
      receiverId: data.receiverId,
      text: data.text,
      ciphertext: data.ciphertext || '',
      nonce: data.nonce || '',
      authTag: data.authTag || '',
      pqcSessionKeyId: data.pqcSessionKeyId || '',
      read: false,
      timestamp
    };
  },

  async getConversation(userId1, userId2) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.getConversation(userId1, userId2);
    }
    if (!sqliteStatements.getConversation) return [];
    return sqliteStatements.getConversation.all(userId1, userId2, userId2, userId1) || [];
  },

  async getTotalMessageCount() {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.getTotalMessageCount();
    }
    if (!sqliteStatements.countMessages) return 0;
    const row = sqliteStatements.countMessages.get();
    return row ? row.count : 0;
  },

  async markMessagesAsRead(senderId, receiverId) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.markMessagesAsRead(senderId, receiverId);
    }
    if (sqliteStatements.markMessagesAsRead) {
      sqliteStatements.markMessagesAsRead.run(senderId, receiverId);
    }
  },

  async createVaultFile(data) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.createVaultFile(data);
    }
    return null;
  },

  async getVaultFiles(userId) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.getVaultFiles(userId);
    }
    return [];
  },

  async getVaultFileById(id, userId) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.getVaultFileById(id, userId);
    }
    return null;
  },

  async deleteVaultFile(id, userId) {
    if (MongoAdapter.isConnected()) {
      return await MongoAdapter.deleteVaultFile(id, userId);
    }
    return false;
  }
};

module.exports = DB;
