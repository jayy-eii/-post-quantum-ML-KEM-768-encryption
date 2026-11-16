/**
 * QUANTUM-SAFE MongoDB Enterprise Database Adapter
 * Powered by Mongoose with automatic connection management, indexing, and query translation.
 */

try { require('dotenv').config(); } catch {}

const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
const Message = require('./models/Message');
const VaultFile = require('./models/VaultFile');

let isConnected = false;

async function connectMongo(uri) {
  const targetUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quantum_safe';
  let mongoose;
  try {
    mongoose = require('mongoose');
  } catch (e) {
    console.warn('[MongoDB] Mongoose package is not installed. To use MongoDB, run: npm install mongoose dotenv');
    return false;
  }

  try {
    console.log(`[MongoDB] Connecting to: ${targetUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    await mongoose.connect(targetUri, {
      dbName: 'quantum_safe',
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('🛡️  [MongoDB] Connected successfully to Quantum-Safe database cluster (DB: quantum_safe).');
    return true;
  } catch (err) {
    console.warn('[MongoDB] Connection attempt failed:', err.message);
    isConnected = false;
    return false;
  }
}

const MongoAdapter = {
  isConnected() {
    return isConnected;
  },

  async findUserByEmail(email) {
    if (!User || !isConnected) return null;
    const doc = await User.findOne({ email: email.trim().toLowerCase() }).lean();
    if (!doc) return null;
    return {
      ...doc,
      id: doc._id.toString(),
      password_hash: doc.passwordHash,
      pqc_algorithm: doc.pqcAlgorithm,
      pqc_public_key: doc.pqcPublicKey,
      pqc_secret_key: doc.pqcSecretKey || '',
      pqc_fingerprint: doc.pqcFingerprint,
      avatar_initials: doc.avatarInitials,
      created_at: new Date(doc.createdAt).getTime(),
      last_login_at: new Date(doc.lastLoginAt).getTime()
    };
  },

  async findUserById(id) {
    if (!User || !isConnected || !id) return null;
    try {
      let doc = null;
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await User.findById(id).lean();
      }
      if (!doc) {
        doc = await User.findOne({ email: id.toString().trim().toLowerCase() }).lean();
      }
      if (!doc) return null;
      return {
        ...doc,
        id: doc._id.toString(),
        password_hash: doc.passwordHash,
        pqc_algorithm: doc.pqcAlgorithm,
        pqc_public_key: doc.pqcPublicKey,
        pqc_secret_key: doc.pqcSecretKey || '',
        pqc_fingerprint: doc.pqcFingerprint,
        avatar_initials: doc.avatarInitials,
        created_at: new Date(doc.createdAt).getTime(),
        last_login_at: new Date(doc.lastLoginAt).getTime()
      };
    } catch {
      return null;
    }
  },

  async createUser(userData) {
    if (!User || !isConnected) return null;
    const {
      name,
      email,
      passwordHash,
      salt,
      role = 'Security Analyst',
      organization = 'Quantum-Safe Network',
      pqcAlgorithm = 'ML-KEM-768 (NIST FIPS 203)',
      pqcPublicKey = '',
      pqcSecretKey = '',
      pqcFingerprint = '',
      avatarInitials = 'QS'
    } = userData;

    const doc = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      salt,
      role,
      organization,
      pqcAlgorithm,
      pqcPublicKey,
      pqcSecretKey,
      pqcFingerprint,
      avatarInitials
    });

    return await this.findUserById(doc._id.toString());
  },

  async updateUserLoginTime(id, timestamp = Date.now()) {
    if (!User || !isConnected) return;
    try {
      await User.findByIdAndUpdate(id, { lastLoginAt: new Date(timestamp) });
    } catch (e) {
      console.warn('[MongoDB] updateUserLoginTime error:', e);
    }
  },

  async updateUserProfile(id, { name, organization, role }) {
    if (!User || !isConnected) return null;
    try {
      const updates = {};
      if (name) updates.name = name;
      if (organization) updates.organization = organization;
      if (role) updates.role = role;

      await User.findByIdAndUpdate(id, updates);
      return await this.findUserById(id);
    } catch {
      return null;
    }
  },

  async createAuditLog(logData) {
    if (!AuditLog || !isConnected) return;
    try {
      await AuditLog.create({
        userId: logData.userId || null,
        category: logData.category || 'AUTH',
        event: logData.event,
        details: logData.details,
        status: logData.status || 'SUCCESS',
        actor: logData.actor,
        badgeClass: logData.badgeClass || 'badge-teal',
        ipAddress: logData.ipAddress || '127.0.0.1',
        timestamp: new Date(logData.timestamp || Date.now())
      });
    } catch (e) {
      console.warn('[MongoDB] createAuditLog error:', e);
    }
  },

  async getAuditLogs(limit = 50) {
    if (!AuditLog || !isConnected) return [];
    try {
      const docs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean();
      return docs.map(d => ({
        id: `LOG-${d._id.toString().substring(0, 6).toUpperCase()}`,
        user_id: d.userId ? d.userId.toString() : null,
        category: d.category,
        event: d.event,
        details: d.details,
        status: d.status,
        actor: d.actor,
        badge_class: d.badgeClass,
        ip_address: d.ipAddress,
        timestamp: new Date(d.timestamp).getTime()
      }));
    } catch {
      return [];
    }
  },

  async getAllUsers(excludeId = null) {
    if (!User || !isConnected) return [];
    try {
      let query = {};
      const mongoose = require('mongoose');
      if (excludeId) {
        if (mongoose.Types.ObjectId.isValid(excludeId)) {
          query = { _id: { $ne: new mongoose.Types.ObjectId(excludeId) } };
        } else {
          query = { email: { $ne: excludeId.toString().toLowerCase() } };
        }
      }
      const docs = await User.find(query).select('-passwordHash -salt').lean();
      return docs.map(d => ({
        id: d._id.toString(),
        name: d.name,
        email: d.email,
        role: d.role,
        organization: d.organization,
        pqcFingerprint: d.pqcFingerprint,
        avatarInitials: d.avatarInitials,
        createdAt: d.createdAt
      }));
    } catch (e) {
      console.warn('[MongoDB] getAllUsers error:', e);
      return [];
    }
  },

  async createMessage({ senderId, receiverId, text, ciphertext = '', nonce = '', authTag = '', encapsulatedKey = '', pqcSessionKeyId = '', timestamp = Date.now() }) {
    if (!Message || !isConnected) return null;
    try {
      const doc = await Message.create({
        senderId: senderId.toString(),
        receiverId: receiverId.toString(),
        text,
        ciphertext,
        nonce,
        authTag,
        encapsulatedKey,
        pqcSessionKeyId,
        timestamp: new Date(timestamp)
      });
      return {
        id: doc._id.toString(),
        senderId: doc.senderId,
        receiverId: doc.receiverId,
        text: doc.text,
        ciphertext: doc.ciphertext,
        nonce: doc.nonce,
        authTag: doc.authTag,
        encapsulatedKey: doc.encapsulatedKey || '',
        pqcSessionKeyId: doc.pqcSessionKeyId,
        read: doc.read,
        timestamp: new Date(doc.timestamp).getTime()
      };
    } catch (e) {
      console.warn('[MongoDB] createMessage error:', e);
      return null;
    }
  },

  async getConversation(userId1, userId2) {
    if (!Message || !isConnected) return [];
    try {
      const u1 = userId1.toString();
      const u2 = userId2.toString();
      const docs = await Message.find({
        $or: [
          { senderId: u1, receiverId: u2 },
          { senderId: u2, receiverId: u1 }
        ]
      }).sort({ timestamp: 1 }).lean();

      return docs.map(d => ({
        id: d._id.toString(),
        senderId: d.senderId,
        receiverId: d.receiverId,
        text: d.text,
        ciphertext: d.ciphertext,
        nonce: d.nonce,
        authTag: d.authTag,
        encapsulatedKey: d.encapsulatedKey || '',
        pqcSessionKeyId: d.pqcSessionKeyId,
        read: d.read,
        timestamp: new Date(d.timestamp).getTime()
      }));
    } catch (e) {
      console.warn('[MongoDB] getConversation error:', e);
      return [];
    }
  },

  async getTotalMessageCount() {
    if (!Message || !isConnected) return 0;
    try {
      return await Message.countDocuments();
    } catch {
      return 0;
    }
  },

  async markMessagesAsRead(senderId, receiverId) {
    if (!Message || !isConnected) return;
    try {
      await Message.updateMany(
        { senderId: senderId.toString(), receiverId: receiverId.toString(), read: false },
        { read: true }
      );
    } catch (e) {
      console.warn('[MongoDB] markMessagesAsRead error:', e);
    }
  },

  async createVaultFile({ userId, fileName, fileSize, mimeType, encryptedBlobHash, cipher = 'ML-KEM-768 + AES-256-GCM', nonce, authTag, encapsulatedKey, secretKey, encryptedData, uploadDate = Date.now() }) {
    if (!VaultFile || !isConnected) return null;
    try {
      const doc = await VaultFile.create({
        userId: userId.toString(),
        fileName,
        fileSize,
        mimeType,
        encryptedBlobHash,
        cipher,
        nonce,
        authTag,
        encapsulatedKey,
        secretKey,
        encryptedData,
        uploadDate: new Date(uploadDate)
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        encryptedBlobHash: doc.encryptedBlobHash,
        cipher: doc.cipher,
        nonce: doc.nonce,
        authTag: doc.authTag,
        encapsulatedKey: doc.encapsulatedKey,
        uploadDate: new Date(doc.uploadDate).getTime()
      };
    } catch (e) {
      console.warn('[MongoDB] createVaultFile error:', e);
      return null;
    }
  },

  async getVaultFiles(userId) {
    if (!VaultFile || !isConnected) return [];
    try {
      const docs = await VaultFile.find({ userId: userId.toString() })
        .select('-encryptedData -secretKey')
        .sort({ uploadDate: -1 })
        .lean();

      return docs.map(d => ({
        id: d._id.toString(),
        userId: d.userId,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        encryptedBlobHash: d.encryptedBlobHash,
        cipher: d.cipher,
        nonce: d.nonce,
        authTag: d.authTag,
        encapsulatedKey: d.encapsulatedKey,
        uploadDate: new Date(d.uploadDate).getTime()
      }));
    } catch (e) {
      console.warn('[MongoDB] getVaultFiles error:', e);
      return [];
    }
  },

  async getVaultFileById(id, userId) {
    if (!VaultFile || !isConnected) return null;
    try {
      const mongoose = require('mongoose');
      let doc = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await VaultFile.findOne({ _id: id, userId: userId.toString() }).lean();
      }
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        encryptedBlobHash: doc.encryptedBlobHash,
        cipher: doc.cipher,
        nonce: doc.nonce,
        authTag: doc.authTag,
        encapsulatedKey: doc.encapsulatedKey,
        secretKey: doc.secretKey,
        encryptedData: doc.encryptedData,
        uploadDate: new Date(doc.uploadDate).getTime()
      };
    } catch (e) {
      console.warn('[MongoDB] getVaultFileById error:', e);
      return null;
    }
  },

  async deleteVaultFile(id, userId) {
    if (!VaultFile || !isConnected) return false;
    try {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(id)) {
        const res = await VaultFile.deleteOne({ _id: id, userId: userId.toString() });
        return res.deletedCount > 0;
      }
      return false;
    } catch (e) {
      console.warn('[MongoDB] deleteVaultFile error:', e);
      return false;
    }
  }
};

module.exports = {
  connectMongo,
  MongoAdapter
};
