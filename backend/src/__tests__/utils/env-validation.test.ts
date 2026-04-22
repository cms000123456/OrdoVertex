import { validateEnvOrExit } from '../../utils/env-validation';

describe('validateEnvOrExit', () => {
  const originalEnv = process.env;
  const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://user:pass@localhost/db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'my-very-long-and-secure-jwt-key-32chars+',
      ENCRYPTION_KEY: 'a-very-long-and-secure-encryption-key',
    };
    mockExit.mockClear();
    mockError.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('should pass with valid environment variables', () => {
    validateEnvOrExit();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should exit when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    validateEnvOrExit();
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL'));
  });

  it('should exit when DATABASE_URL does not start with postgresql://', () => {
    process.env.DATABASE_URL = 'mysql://localhost/db';
    validateEnvOrExit();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should exit when JWT_SECRET is too short', () => {
    process.env.JWT_SECRET = 'short';
    validateEnvOrExit();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should exit when JWT_SECRET contains weak patterns', () => {
    process.env.JWT_SECRET = 'password123456789012345678901234567';
    validateEnvOrExit();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should exit when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    validateEnvOrExit();
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('ENCRYPTION_KEY'));
  });

  it('should exit when REDIS_URL is missing', () => {
    delete process.env.REDIS_URL;
    validateEnvOrExit();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
