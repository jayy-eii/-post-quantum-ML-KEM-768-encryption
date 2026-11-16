/**
 * QUANTUM-SAFE Encrypted File Vault Mongoose Schema
 * Stores encrypted blob metadata, SHA-256 integrity hash, and user ownership.
 */

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let VaultFileSchema = null;
let VaultFileModel = null;

if (mongoose) {
  VaultFileSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream'
    },
    encryptedBlobHash: {
      type: String,
      required: true
    },
    cipher: {
      type: String,
      default: 'ML-KEM-768 + AES-256-GCM'
    },
    nonce: {
      type: String,
      default: ''
    },
    authTag: {
      type: String,
      default: ''
    },
    encapsulatedKey: {
      type: String,
      default: ''
    },
    secretKey: {
      type: String,
      default: ''
    },
    encryptedData: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true
    }
  }, {
    timestamps: true
  });

  VaultFileModel = mongoose.models.VaultFile || mongoose.model('VaultFile', VaultFileSchema);
}

module.exports = VaultFileModel;
