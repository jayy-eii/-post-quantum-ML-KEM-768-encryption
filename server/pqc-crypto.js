/**
 * QUANTUM-SAFE Post-Quantum Cryptographic Engine
 * Implements NIST FIPS 203 ML-KEM-768 (Module-Lattice Key Encapsulation)
 * and AES-256-GCM (Authenticated Encryption with Associated Data).
 */

const { ml_kem768 } = require('@noble/post-quantum/ml-kem.js');
const crypto = require('node:crypto');

/**
 * Generate a new ML-KEM-768 public/private keypair
 * Public key: 1,184 Bytes
 * Secret key: 2,400 Bytes
 */
function generateMlKemKeypair() {
  const keys = ml_kem768.keygen();
  const publicKeyHex = Buffer.from(keys.publicKey).toString('hex');
  const secretKeyHex = Buffer.from(keys.secretKey).toString('hex');

  // Compute SHA-256 fingerprint formatted as 8-segment hex string
  const hash = crypto.createHash('sha256').update(keys.publicKey).digest('hex').toUpperCase();
  const fingerprint = hash.substring(0, 32).match(/.{1,4}/g).join(':');

  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyHex,
    secretKeyHex,
    fingerprint,
    publicKeyBytes: keys.publicKey.length,
    secretKeyBytes: keys.secretKey.length
  };
}

/**
 * Encapsulate a shared secret using a peer's 1,184-byte ML-KEM public key
 * Output: 1,088-byte ciphertext + 32-byte (256-bit) shared secret
 */
function encapsulateKey(publicKeyHex) {
  const cleanHex = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
  const pkBytes = Buffer.from(cleanHex, 'hex');

  if (pkBytes.length !== 1184) {
    throw new Error(`Invalid ML-KEM-768 public key length: ${pkBytes.length} bytes (expected 1,184 bytes).`);
  }

  const { cipherText, sharedSecret } = ml_kem768.encapsulate(pkBytes);

  return {
    cipherText,
    sharedSecret,
    cipherTextHex: Buffer.from(cipherText).toString('hex'),
    sharedSecretHex: Buffer.from(sharedSecret).toString('hex'),
    cipherTextBytes: cipherText.length,
    sharedSecretBytes: sharedSecret.length
  };
}

/**
 * Decapsulate a shared secret using a 1,088-byte ciphertext and 2,400-byte secret key
 * Output: 32-byte (256-bit) shared secret
 */
function decapsulateKey(cipherTextHex, secretKeyHex) {
  const cleanCipher = cipherTextHex.startsWith('0x') ? cipherTextHex.slice(2) : cipherTextHex;
  const cleanSecret = secretKeyHex.startsWith('0x') ? secretKeyHex.slice(2) : secretKeyHex;

  const ctBytes = Buffer.from(cleanCipher, 'hex');
  const skBytes = Buffer.from(cleanSecret, 'hex');

  if (ctBytes.length !== 1088) {
    throw new Error(`Invalid ML-KEM-768 ciphertext length: ${ctBytes.length} bytes (expected 1,088 bytes).`);
  }
  if (skBytes.length !== 2400) {
    throw new Error(`Invalid ML-KEM-768 secret key length: ${skBytes.length} bytes (expected 2,400 bytes).`);
  }

  const sharedSecret = ml_kem768.decapsulate(ctBytes, skBytes);

  return {
    sharedSecret,
    sharedSecretHex: Buffer.from(sharedSecret).toString('hex'),
    sharedSecretBytes: sharedSecret.length
  };
}

/**
 * Encrypt message with AES-256-GCM using 32-byte key derived from ML-KEM
 */
function encryptAes256Gcm(plaintext, keyHexOrBytes) {
  const keyBytes = typeof keyHexOrBytes === 'string'
    ? Buffer.from(keyHexOrBytes.startsWith('0x') ? keyHexOrBytes.slice(2) : keyHexOrBytes, 'hex')
    : Buffer.from(keyHexOrBytes);

  if (keyBytes.length !== 32) {
    throw new Error(`Invalid AES-256 key length: ${keyBytes.length} bytes (expected 32 bytes).`);
  }

  // 96-bit nonce (12 bytes) recommended by NIST SP 800-38D
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag(); // 128-bit GHASH tag (16 bytes)

  return {
    ciphertext,
    nonce: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt message with AES-256-GCM using 32-byte key and verify 128-bit GHASH tag
 */
function decryptAes256Gcm(ciphertextHex, keyHexOrBytes, nonceHex, authTagHex) {
  const keyBytes = typeof keyHexOrBytes === 'string'
    ? Buffer.from(keyHexOrBytes.startsWith('0x') ? keyHexOrBytes.slice(2) : keyHexOrBytes, 'hex')
    : Buffer.from(keyHexOrBytes);

  const iv = Buffer.from(nonceHex.startsWith('0x') ? nonceHex.slice(2) : nonceHex, 'hex');
  const authTag = Buffer.from(authTagHex.startsWith('0x') ? authTagHex.slice(2) : authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt a secret key using Scrypt-derived key from master password
 */
function protectSecretKey(secretKeyHex, password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(secretKeyHex, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt a secret key using Scrypt-derived key from master password
 */
function recoverSecretKey(envelope, password, saltHex) {
  const [ivHex, tagHex, encryptedHex] = envelope.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  generateMlKemKeypair,
  encapsulateKey,
  decapsulateKey,
  encryptAes256Gcm,
  decryptAes256Gcm,
  protectSecretKey,
  recoverSecretKey
};
