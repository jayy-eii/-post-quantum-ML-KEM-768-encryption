/**
 * QUANTUM-SAFE 1-to-1 Encrypted Message Mongoose Schema
 * Stores ciphertext, 96-bit AES-GCM nonce, and 128-bit GHASH authentication tag.
 */

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let MessageSchema = null;
let MessageModel = null;

if (mongoose) {
  MessageSchema = new mongoose.Schema({
    senderId: {
      type: String,
      required: true,
      index: true
    },
    receiverId: {
      type: String,
      required: true,
      index: true
    },
    text: {
      type: String,
      required: true
    },
    ciphertext: {
      type: String,
      default: ''
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
    pqcSessionKeyId: {
      type: String,
      default: ''
    },
    read: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  }, {
    timestamps: true
  });

  MessageModel = mongoose.models.Message || mongoose.model('Message', MessageSchema);
}

module.exports = MessageModel;
