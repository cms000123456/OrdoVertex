import { hashPassword, verifyPassword, generateToken, verifyToken } from '../../utils/auth';
import jwt from 'jsonwebtoken';

describe('hashPassword / verifyPassword', () => {
  it('should hash a password', async () => {
    const password = 'mySecurePassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt hash format
  });

  it('should verify a correct password', async () => {
    const password = 'mySecurePassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'mySecurePassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for the same password', async () => {
    const password = 'samePassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
    
    // Both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});

describe('generateToken / verifyToken', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-32-chars-long!';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('should generate a token with user data', () => {
    const token = generateToken('user-123', 'test@example.com', 'admin');
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format
  });

  it('should verify a valid token', () => {
    const token = generateToken('user-123', 'test@example.com', 'admin');
    const decoded = verifyToken(token);
    
    expect(decoded.id).toBe('user-123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('admin');
  });

  it('should verify token without role', () => {
    const token = generateToken('user-456', 'user@example.com');
    const decoded = verifyToken(token);
    
    expect(decoded.id).toBe('user-456');
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.role).toBeUndefined();
  });

  it('should throw for an invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  it('should throw for a tampered token', () => {
    const token = generateToken('user-123', 'test@example.com');
    const tampered = token.slice(0, -5) + 'xxxxx';
    
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('should include expiration', () => {
    const token = generateToken('user-123', 'test@example.com');
    const decoded = jwt.decode(token) as { exp?: number };
    
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp! * 1000).toBeGreaterThan(Date.now());
  });
});
