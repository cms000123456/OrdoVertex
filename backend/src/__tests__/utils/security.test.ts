import { encrypt, decrypt } from '../../utils/encryption';
import { validateExpression, safeEvaluateMath, safeEvaluateCondition } from '../../utils/safe-eval';
import { isInternalUrl, sanitizeInput, isSafeIdentifier } from '../../utils/security';
import { validateEnv } from '../../utils/env-validation';

describe('Encryption', () => {
  test('encrypt/decrypt roundtrip works', () => {
    const original = 'sensitive data here';
    const { encrypted, iv } = encrypt(original);
    expect(encrypted).toBeTruthy();
    expect(iv).toBeTruthy();
    expect(encrypted).not.toBe(original);

    const decrypted = decrypt(encrypted, iv);
    expect(decrypted).toBe(original);
  });

  test('encrypt produces different output each time', () => {
    const data = 'same input';
    const result1 = encrypt(data);
    const result2 = encrypt(data);
    expect(result1.encrypted).not.toBe(result2.encrypted);
    expect(result1.iv).not.toBe(result2.iv);
  });

  test('decrypt with wrong iv fails', () => {
    const { encrypted } = encrypt('test');
    expect(() => decrypt(encrypted, 'wrongiv123456789')).toThrow();
  });

  test('decrypt with tampered ciphertext fails', () => {
    const { encrypted, iv } = encrypt('test');
    const tampered = encrypted.slice(0, -4) + 'dead';
    expect(() => decrypt(tampered, iv)).toThrow();
  });
});

describe('Safe Expression Validation', () => {
  test('allows safe math expressions', () => {
    expect(validateExpression('a + b').valid).toBe(true);
    expect(validateExpression('x * y / z').valid).toBe(true);
    expect(validateExpression('(a - b) % c').valid).toBe(true);
    expect(validateExpression('Math.abs(value)').valid).toBe(true);
  });

  test('blocks eval keyword', () => {
    expect(validateExpression('eval("1+1")').valid).toBe(false);
  });

  test('blocks Function constructor', () => {
    expect(validateExpression('Function("return 1")').valid).toBe(false);
  });

  test('blocks require', () => {
    expect(validateExpression('require("fs")').valid).toBe(false);
  });

  test('blocks process', () => {
    expect(validateExpression('process.exit(1)').valid).toBe(false);
  });

  test('blocks string literals', () => {
    expect(validateExpression('"hello"').valid).toBe(false);
    expect(validateExpression("'hello'").valid).toBe(false);
  });

  test('blocks backtick template literals', () => {
    expect(validateExpression('`hello ${x}`').valid).toBe(false);
  });

  test('blocks backslash escapes', () => {
    expect(validateExpression('\\x41').valid).toBe(false);
  });

  test('blocks prototype access', () => {
    expect(validateExpression('obj.__proto__').valid).toBe(false);
    expect(validateExpression('obj.prototype').valid).toBe(false);
  });

  test('blocks constructor access', () => {
    expect(validateExpression('obj.constructor').valid).toBe(false);
  });
});

describe('Safe Math Evaluation', () => {
  test('evaluates simple math', () => {
    expect(safeEvaluateMath('a + b', { a: 2, b: 3 })).toBe(5);
  });

  test('evaluates complex expressions', () => {
    expect(safeEvaluateMath('(a + b) * c', { a: 1, b: 2, c: 3 })).toBe(9);
  });

  test('throws on invalid expression', () => {
    expect(() => safeEvaluateMath('eval("1")', {})).toThrow();
  });

  test('returns null for NaN result', () => {
    expect(safeEvaluateMath('0 / 0', {})).toBeNull();
  });
});

describe('Safe Condition Evaluation', () => {
  test('evaluates boolean conditions', () => {
    expect(safeEvaluateCondition('item.age > 18', { age: 21 })).toBe(true);
    expect(safeEvaluateCondition('item.age > 18', { age: 16 })).toBe(false);
  });

  test('throws on invalid condition', () => {
    expect(() => safeEvaluateCondition('eval("1")', {})).toThrow();
  });
});

describe('SSRF Protection', () => {
  test('detects localhost', () => {
    expect(isInternalUrl('http://localhost:3000/api')).toBe(true);
    expect(isInternalUrl('http://127.0.0.1:3000')).toBe(true);
    expect(isInternalUrl('http://::1/health')).toBe(true);
  });

  test('detects private IP ranges', () => {
    expect(isInternalUrl('http://10.0.0.1')).toBe(true);
    expect(isInternalUrl('http://192.168.1.1')).toBe(true);
    expect(isInternalUrl('http://172.16.0.1')).toBe(true);
    expect(isInternalUrl('http://172.31.255.255')).toBe(true);
    expect(isInternalUrl('http://127.0.0.53')).toBe(true);
  });

  test('detects link-local addresses', () => {
    expect(isInternalUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
  });

  test('detects cloud metadata endpoints', () => {
    expect(isInternalUrl('http://169.254.169.254')).toBe(true);
    expect(isInternalUrl('http://metadata.google.internal')).toBe(true);
  });

  test('allows public URLs', () => {
    expect(isInternalUrl('https://api.example.com')).toBe(false);
    expect(isInternalUrl('https://hooks.slack.com/services/xxx')).toBe(false);
    expect(isInternalUrl('https://8.8.8.8')).toBe(false);
  });

  test('blocks invalid URLs', () => {
    expect(isInternalUrl('not-a-url')).toBe(true);
  });
});

describe('Input Sanitization', () => {
  test('removes script tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('');
    expect(sanitizeInput('hello <script>evil()</script> world')).toBe('hello  world');
  });

  test('removes javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
  });

  test('removes event handlers', () => {
    expect(sanitizeInput('<img onerror=alert(1)>')).toBe('<img alert(1)>');
    expect(sanitizeInput('<div onclick=evil()>')).toBe('<div evil()>');
  });

  test('removes null bytes', () => {
    expect(sanitizeInput('hello\x00world')).toBe('helloworld');
  });

  test('passes through safe text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });
});

describe('Safe Identifier', () => {
  test('accepts valid identifiers', () => {
    expect(isSafeIdentifier('users')).toBe(true);
    expect(isSafeIdentifier('_table_name')).toBe(true);
    expect(isSafeIdentifier('table123')).toBe(true);
  });

  test('rejects invalid identifiers', () => {
    expect(isSafeIdentifier('table-name')).toBe(false);
    expect(isSafeIdentifier('table.name')).toBe(false);
    expect(isSafeIdentifier('123table')).toBe(false);
    expect(isSafeIdentifier('table; drop')).toBe(false);
    expect(isSafeIdentifier('')).toBe(false);
  });
});

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('passes with valid environment', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'a-very-long-random-key-32-chars-xyz';
    process.env.ENCRYPTION_KEY = 'another-very-long-random-32-chars!!';
    const issues = validateEnv();
    expect(issues).toEqual([]);
  });

  test('fails with missing required vars', () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.JWT_SECRET;
    delete process.env.ENCRYPTION_KEY;
    const issues = validateEnv();
    expect(issues).toContain('DATABASE_URL is required but not set');
    expect(issues).toContain('REDIS_URL is required but not set');
    expect(issues).toContain('JWT_SECRET is required but not set');
    expect(issues).toContain('ENCRYPTION_KEY is required but not set');
  });

  test('fails with invalid DATABASE_URL', () => {
    process.env.DATABASE_URL = 'mysql://localhost/db';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('DATABASE_URL'))).toBe(true);
  });

  test('fails with invalid REDIS_URL', () => {
    process.env.REDIS_URL = 'mongodb://localhost:27017';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('REDIS_URL'))).toBe(true);
  });

  test('fails with short JWT_SECRET', () => {
    process.env.JWT_SECRET = 'short';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('JWT_SECRET'))).toBe(true);
  });

  test('fails with weak JWT_SECRET', () => {
    process.env.JWT_SECRET = 'password1234567890123456789012345';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('weak'))).toBe(true);
  });

  test('fails with short ENCRYPTION_KEY', () => {
    process.env.ENCRYPTION_KEY = 'short';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('ENCRYPTION_KEY'))).toBe(true);
  });

  test('fails with invalid PORT', () => {
    process.env.PORT = 'abc';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('PORT'))).toBe(true);
  });

  test('fails with invalid NODE_ENV', () => {
    process.env.NODE_ENV = 'staging';
    const issues = validateEnv();
    expect(issues.some(i => i.includes('NODE_ENV'))).toBe(true);
  });
});
