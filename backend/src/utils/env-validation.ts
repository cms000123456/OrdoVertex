/**
 * Centralized environment variable validation.
 * Fails fast on startup with clear error messages instead of
 * cryptic runtime failures later.
 */

interface EnvRule {
  name: string;
  required: boolean;
  validate?: (value: string) => { valid: boolean; message?: string };
}

const RULES: EnvRule[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    validate: (v) => ({
      valid: v.startsWith('postgresql://') || v.startsWith('postgres://'),
      message: 'DATABASE_URL must be a PostgreSQL connection string (postgresql://...)',
    }),
  },
  {
    name: 'REDIS_URL',
    required: true,
    validate: (v) => ({
      valid: v.startsWith('redis://') || v.startsWith('rediss://'),
      message: 'REDIS_URL must be a Redis connection string (redis://...)',
    }),
  },
  {
    name: 'JWT_SECRET',
    required: true,
    validate: (v) => {
      if (v.length < 32) {
        return { valid: false, message: 'JWT_SECRET must be at least 32 characters long (use: openssl rand -base64 32)' };
      }
      const weakSecrets = ['secret', 'password', '123456', 'changeme', 'default'];
      if (weakSecrets.some((w) => v.toLowerCase().includes(w))) {
        return { valid: false, message: 'JWT_SECRET appears to be a weak/default value. Generate a strong random secret.' };
      }
      return { valid: true };
    },
  },
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    validate: (v) => {
      if (v.length < 32) {
        return { valid: false, message: 'ENCRYPTION_KEY must be at least 32 characters long (use: openssl rand -hex 32)' };
      }
      return { valid: true };
    },
  },
  {
    name: 'PORT',
    required: false,
    validate: (v) => {
      const port = parseInt(v, 10);
      return { valid: !isNaN(port) && port > 0 && port <= 65535, message: 'PORT must be a valid port number (1-65535)' };
    },
  },
  {
    name: 'NODE_ENV',
    required: false,
    validate: (v) => ({
      valid: ['development', 'production', 'test'].includes(v),
      message: 'NODE_ENV must be one of: development, production, test',
    }),
  },
  {
    name: 'CORS_ORIGIN',
    required: false,
  },
];

export function validateEnv(): string[] {
  const issues: string[] = [];

  for (const rule of RULES) {
    const value = process.env[rule.name];

    if (rule.required && (!value || value.trim() === '')) {
      issues.push(`${rule.name} is required but not set`);
      continue;
    }

    if (value && rule.validate) {
      const result = rule.validate(value);
      if (!result.valid) {
        issues.push(`${rule.name}: ${result.message}`);
      }
    }
  }

  return issues;
}

export function validateEnvOrExit(): void {
  const issues = validateEnv();
  if (issues.length > 0) {
    // eslint-disable-next-line no-console
    console.error('\n❌ Environment Validation Failed\n');
    for (const issue of issues) {
      // eslint-disable-next-line no-console
      console.error(`  • ${issue}`);
    }
    // eslint-disable-next-line no-console
    console.error('\nPlease check your .env file or environment configuration.\n');
    process.exit(1);
  }
}
