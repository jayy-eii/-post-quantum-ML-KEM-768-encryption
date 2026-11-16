/**
 * QUANTUM-SAFE Authentication & Cryptography Services
 * Implements salted Scrypt password hashing, constant-time verification,
 * and HS256 zero-dependency JWT token generation/validation.
 */

const crypto = require('node:crypto');

// Server JWT Signing Secret
const JWT_SECRET = process.env.JWT_SECRET || 'quantum_safe_lattice_master_signing_secret_key_512bit';

function base64UrlEncode(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  return buf.toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Hash password using Scrypt with cryptographically random salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return {
    salt,
    hash: derivedKey.toString('hex')
  };
}

/**
 * Verify password in constant time to resist side-channel timing attacks
 */
function verifyPassword(password, salt, storedHashHex) {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const storedBuf = Buffer.from(storedHashHex, 'hex');
    if (derivedKey.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedBuf);
  } catch (err) {
    return false;
  }
}

/**
 * Sign JWT token with HMAC-SHA256
 */
function createToken(payload, expiresInSeconds = 86400) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(tokenPayload);
  const message = `${headerB64}.${payloadB64}`;

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('base64url');
  return `${message}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const message = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('base64url');

  if (signature.length !== expectedSig.length) return null;

  try {
    const match = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!match) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Generate formatted PQC ML-KEM-768 fingerprint
 */
function generatePqcFingerprint() {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString('hex').toUpperCase();
  return hex.match(/.{1,4}/g).join(':');
}

/**
 * Generate simulated ML-KEM-768 lattice public key string representation (1,184 Bytes)
 */
function generatePqcPublicKeyRep() {
  return '0x' + crypto.randomBytes(1184).toString('hex');
}

/**
 * Derive user avatar initials from full name
 */
function deriveAvatarInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'QS';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Validate registration input parameters
 */
function validateRegistrationInput({ name, email, password }) {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Master password must be at least 8 characters long.');
  } else {
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      errors.push('Password must include both uppercase and lowercase letters.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must include at least one number.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must include at least one special character symbol.');
    }
  }

  return errors;
}

/**
 * Format user for public consumption (stripping password hash and salt)
 */
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organization: user.organization,
    pqcAlgorithm: user.pqc_algorithm || 'ML-KEM-768 (NIST FIPS 203)',
    pqcPublicKey: user.pqc_public_key,
    pqcFingerprint: user.pqc_fingerprint,
    avatarInitials: user.avatar_initials,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  generatePqcFingerprint,
  generatePqcPublicKeyRep,
  deriveAvatarInitials,
  validateRegistrationInput,
  sanitizeUser
};
