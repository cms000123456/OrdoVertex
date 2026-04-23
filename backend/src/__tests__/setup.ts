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

// Clean up after each test — delete children before parents to avoid FK violations
afterEach(async () => {
  const tablesInOrder = [
    // Logs and executions (leaf nodes)
    'ExecutionLog',
    'NodeExecution',
    'AlertHistory',
    // Workflow children
    'Trigger',
    'Alert',
    'WorkflowExecution',
    // Workspace children
    'WorkspaceMember',
    'GroupWorkspaceAccess',
    'UserGroupMember',
    'UserGroup',
    // Workflow (depends on User + Workspace)
    'Workflow',
    // User children
    'ApiKey',
    'Credential',
    'MFASettings',
    'VerificationToken',
    // Workspace depends on User
    'Workspace',
    'SAMLConfig',
    // User last
    'User',
  ];

  for (const table of tablesInOrder) {
    try {
      await (prisma as any)[table].deleteMany({});
    } catch {
      // Table might not exist or model name differs — ignore
    }
  }
});
