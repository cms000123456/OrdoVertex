import { encrypt, decrypt, encryptJSON, decryptJSON, EncryptedData } from '../../utils/encryption';

describe('encryption', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-32-chars-long!!';
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const original = 'Hello, World!';
      const encrypted = encrypt(original);
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted.encrypted).not.toBe(original);
      expect(encrypted.iv).toHaveLength(32); // 16 bytes hex = 32 chars
      
      const decrypted = decrypt(encrypted.encrypted, encrypted.iv);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertexts for the same plaintext', () => {
      const original = 'Same text';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      expect(decrypt(encrypted1.encrypted, encrypted1.iv)).toBe(original);
      expect(decrypt(encrypted2.encrypted, encrypted2.iv)).toBe(original);
    });

    it('should handle empty string', () => {
      const original = '';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted.encrypted, encrypted.iv);
      expect(decrypted).toBe(original);
    });

    it('should handle unicode characters', () => {
      const original = '日本語テキスト 🚀 émojis';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted.encrypted, encrypted.iv);
      expect(decrypted).toBe(original);
    });

    it('should handle long strings', () => {
      const original = 'a'.repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted.encrypted, encrypted.iv);
      expect(decrypted).toBe(original);
    });

    it('should throw when decrypting with wrong iv', () => {
      const encrypted = encrypt('test');
      const wrongIv = '0'.repeat(32);
      
      expect(() => decrypt(encrypted.encrypted, wrongIv)).toThrow();
    });

    it('should throw when decrypting tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const tampered = encrypted.encrypted.slice(0, -4) + 'dead';
      
      expect(() => decrypt(tampered, encrypted.iv)).toThrow();
    });
  });

  describe('encryptJSON / decryptJSON', () => {
    it('should encrypt and decrypt an object', () => {
      const original = { name: 'John', age: 30, active: true };
      const encrypted = encryptJSON(original);
      const decrypted = decryptJSON(encrypted.encrypted, encrypted.iv);
      
      expect(decrypted).toEqual(original);
    });

    it('should handle nested objects', () => {
      const original = {
        user: { id: 1, profile: { name: 'Test' } },
        roles: ['admin', 'user']
      };
      const encrypted = encryptJSON(original);
      const decrypted = decryptJSON(encrypted.encrypted, encrypted.iv);
      
      expect(decrypted).toEqual(original);
    });
  });

  describe('getEncryptionKey', () => {
    it('should throw when ENCRYPTION_KEY is missing', () => {
      const currentKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
      
      process.env.ENCRYPTION_KEY = currentKey;
    });

    it('should throw when ENCRYPTION_KEY is too short', () => {
      const currentKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be at least 32 characters long');
      
      process.env.ENCRYPTION_KEY = currentKey;
    });
  });
});
