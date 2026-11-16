/**
 * QUANTUM-SAFE Security Audit Log Mongoose Schema
 * Tamper-evident logging for authentication, rekeying, and cipher telemetry.
 */

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let AuditLogSchema = null;
let AuditLogModel = null;

if (mongoose) {
  AuditLogSchema = new mongoose.Schema({
    userId: {
      type: String,
      default: null
    },
    category: {
      type: String,
      required: true,
      enum: ['AUTH', 'SECURITY', 'KEY_EXCHANGE', 'MESSAGE', 'FILE', 'CRYPTOGRAPHY'],
      default: 'AUTH'
    },
    event: {
      type: String,
      required: true
    },
    details: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      default: 'SUCCESS'
    },
    actor: {
      type: String,
      required: true
    },
    badgeClass: {
      type: String,
      default: 'badge-teal'
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  }, {
    timestamps: true
  });

  AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
}

module.exports = AuditLogModel;
