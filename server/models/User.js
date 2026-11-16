/**
 * QUANTUM-SAFE User Mongoose Schema
 * Represents authenticated cryptographic identity with ML-KEM-768 lattice parameters.
 */

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

let UserSchema = null;
let UserModel = null;

if (mongoose) {
  UserSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    salt: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: 'Security Analyst'
    },
    organization: {
      type: String,
      default: 'Quantum-Safe Network'
    },
    pqcAlgorithm: {
      type: String,
      default: 'ML-KEM-768 (NIST FIPS 203)'
    },
    pqcPublicKey: {
      type: String,
      default: ''
    },
    pqcSecretKey: {
      type: String,
      default: ''
    },
    pqcPublicKeyBytes: {
      type: Number,
      default: 1184
    },
    pqcSecretKeyBytes: {
      type: Number,
      default: 2400
    },
    pqcFingerprint: {
      type: String,
      default: ''
    },
    avatarInitials: {
      type: String,
      default: 'QS'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastLoginAt: {
      type: Date,
      default: Date.now
    }
  }, {
    timestamps: true
  });

  UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
}

module.exports = UserModel;
