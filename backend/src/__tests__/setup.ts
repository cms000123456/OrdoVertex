import { PrismaClient } from '@prisma/client';
import os from 'os';
import path from 'path';

// Mock JWT_SECRET for tests
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
process.env.LOGS_DIR = path.join(os.tmpdir(), 'ordovertex-test-logs');

// Create test prisma client
export const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Global test teardown
afterAll(async () => {
  await prisma.$disconnect();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data
  const tables = ['WorkflowExecution', 'Workflow', 'User', 'ApiKey'];
  for (const table of tables) {
    try {
      await (prisma as any)[table].deleteMany({});
    } catch (e) {
      // Table might not exist
    }
  }
});
