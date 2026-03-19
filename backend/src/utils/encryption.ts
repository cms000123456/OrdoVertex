import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment or use a default for development
// In production, this should be set via environment variable
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
if (!key) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}
if (key.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
}
  // Hash the key to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
};

export interface EncryptedData {
  encrypted: string;
  iv: string;
}

/**
 * Encrypt sensitive data
 */
export function encrypt(data: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data with auth tag
  const encryptedWithAuthTag = encrypted + authTag.toString('hex');
  
  return {
    encrypted: encryptedWithAuthTag,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  
  // Extract auth tag (last 16 bytes as hex = 32 chars)
  const authTagHex = encryptedData.slice(-32);
  const encrypted = encryptedData.slice(0, -32);
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt a JSON object
 */
export function encryptJSON(data: Record<string, any>): EncryptedData {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt to a JSON object
 */
export function decryptJSON(encryptedData: string, iv: string): Record<string, any> {
  const decrypted = decrypt(encryptedData, iv);
  return JSON.parse(decrypted);
}
