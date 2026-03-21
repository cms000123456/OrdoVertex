# OrdoVertex Test Scheme v2.0

> Comprehensive, actionable testing plan with automated pre-push validation.

## 📊 Quick Status

| Component | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| Backend API | 23+ | 🟡 Partial | 77% |
| Workspace API | 0 | 🔴 Missing | 0% |
| Move Workflow | 0 | 🔴 Missing | 0% |
| Frontend | 0 | 🔴 Missing | 0% |
| E2E | 0 | 🔴 Missing | 0% |

---

## 🎯 Testing Philosophy

**Test Before Push**: Every push must pass:
1. ✅ TypeScript compilation (backend + frontend)
2. ✅ API integration tests
3. ✅ Database migration check
4. ✅ Lint checks

---

## 🚀 Quick Start

```bash
# Run all tests before pushing
npm run test:all

# Run specific test suites
npm run test:backend          # Backend API tests
npm run test:workflows        # Workflow-specific tests
npm run test:workspaces       # Workspace-specific tests
npm run test:typecheck        # TypeScript checks
npm run test:pre-push         # Full pre-push suite
```

---

## 📁 Test Structure

```
backend/src/__tests__/
├── setup.ts                    # Test configuration
├── utils/
│   ├── auth.test.ts           # JWT, password hashing
│   ├── encryption.test.ts     # AES encryption
│   └── rate-limit.test.ts     # Rate limiting
├── routes/
│   ├── auth.test.ts           # Auth routes
│   ├── workflows.test.ts      # Workflow CRUD + move
│   ├── workspaces.test.ts     # Workspace CRUD
│   └── credentials.test.ts    # Credential routes
├── engine/
│   ├── executor.test.ts       # Workflow execution
│   └── scheduler.test.ts      # Cron scheduling
└── integration/
    └── full-flow.test.ts      # End-to-end scenarios
```

---

## 🧪 Test Categories

### 1. Unit Tests (Priority: High)

#### Backend Utils
```typescript
// utils/auth.test.ts
- [x] JWT generation/verification
- [x] Password hashing (bcrypt)
- [x] Token expiration handling

// utils/encryption.test.ts
- [ ] Encrypt/decrypt roundtrip
- [ ] IV generation uniqueness
- [ ] Key validation

// utils/rate-limit.test.ts
- [ ] Window expiration
- [ ] Count tracking
- [ ] IP identification
```

### 2. Integration Tests (Priority: High)

#### Workflow Routes
```typescript
// routes/workflows.test.ts
- [x] GET /api/workflows - List workflows
- [x] POST /api/workflows - Create workflow
- [x] GET /api/workflows/:id - Get workflow
- [x] PATCH /api/workflows/:id - Update workflow
- [x] DELETE /api/workflows/:id - Delete workflow
- [x] POST /api/workflows/:id/execute - Execute workflow
- [x] POST /api/workflows/:id/move - ⭐ NEW: Move to workspace
```

#### Workspace Routes (NEW)
```typescript
// routes/workspaces.test.ts
- [ ] GET /api/workspaces - List workspaces
- [ ] POST /api/workspaces - Create workspace
- [ ] GET /api/workspaces/:id - Get workspace
- [ ] PATCH /api/workspaces/:id - Update workspace
- [ ] DELETE /api/workspaces/:id - Delete workspace
- [ ] POST /api/workspaces/:id/members - Add member
- [ ] PATCH /api/workspaces/:id/members/:id - Update role
- [ ] DELETE /api/workspaces/:id/members/:id - Remove member
- [ ] POST /api/workspaces/:id/workflows/:id - Add workflow
```

### 3. Feature-Specific Tests

#### Move Workflow Feature
```typescript
describe('POST /api/workflows/:id/move', () => {
  test('should move workflow to workspace', async () => {
    // Create workspace
    // Create workflow (personal)
    // Move workflow to workspace
    // Verify workspaceId updated
  });

  test('should move workflow to personal (null workspace)', async () => {
    // Create workspace with workflow
    // Move workflow to personal
    // Verify workspaceId is null
  });

  test('should reject move to workspace without permission', async () => {
    // Create workspace where user is viewer only
    // Try to move workflow to workspace
    // Expect 403 Forbidden
  });

  test('should reject move of non-owned workflow', async () => {
    // Create workflow as user A
    // Try to move as user B
    // Expect 404 Not Found
  });

  test('should reject move to non-existent workspace', async () => {
    // Try to move to fake workspace ID
    // Expect 403/404 error
  });
});
```

---

## 🔒 Security Tests

```typescript
describe('Security', () => {
  test('should reject requests without auth token', async () => {});
  test('should reject expired tokens', async () => {});
  test('should reject invalid tokens', async () => {});
  test('should prevent SQL injection', async () => {});
  test('should prevent XSS in workflow names', async () => {});
  test('should enforce rate limiting', async () => {});
  test('should validate workspace permissions', async () => {});
});
```

---

## 🔄 Pre-Push Testing

### Git Hook (`.git/hooks/pre-push`)

```bash
#!/bin/bash
echo "🔍 Running pre-push tests..."

# 1. TypeScript compilation
echo "Checking TypeScript..."
cd backend && npx tsc --noEmit || exit 1
cd ../frontend && npx tsc --noEmit || exit 1
cd ..

# 2. Database schema check
echo "Checking database schema..."
cd backend && npx prisma validate || exit 1
cd ..

# 3. Backend tests
echo "Running backend tests..."
cd backend && npm test || exit 1
cd ..

# 4. Frontend build test
echo "Testing frontend build..."
cd frontend && npm run build || exit 1
cd ..

echo "✅ All pre-push tests passed!"
```

### Install Hook
```bash
chmod +x .git/hooks/pre-push
```

---

## 🛠️ Test Commands

### package.json scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:workspaces": "jest workspaces",
    "test:workflows": "jest workflows",
    "test:typecheck": "tsc --noEmit",
    "test:pre-push": "npm run test:typecheck && npm run test"
  }
}
```

---

## 📈 Coverage Targets

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Auth Utils | 0% | 90% | 🔴 High |
| Workflow Routes | 60% | 90% | 🔴 High |
| Workspace Routes | 0% | 90% | 🔴 High |
| Move Workflow | 0% | 100% | 🔴 High |
| Encryption | 0% | 80% | 🟡 Medium |
| Executor | 0% | 70% | 🟡 Medium |

---

## 🎯 Implementation Checklist

### Phase 1: Fix Current Tests (Week 1)
- [ ] Add workspace table to test cleanup
- [ ] Fix test database isolation
- [ ] Add TESTING.md documentation

### Phase 2: Workspace Tests (Week 1-2)
- [ ] Create `routes/workspaces.test.ts`
- [ ] Test all workspace CRUD operations
- [ ] Test member management
- [ ] Test permission checks

### Phase 3: Move Workflow Tests (Week 2)
- [ ] Create workflow move tests
- [ ] Test success cases
- [ ] Test permission failures
- [ ] Test edge cases

### Phase 4: Pre-Push Hook (Week 2)
- [ ] Create pre-push script
- [ ] Add type checking
- [ ] Add build verification
- [ ] Document installation

### Phase 5: CI/CD (Week 3)
- [ ] GitHub Actions workflow
- [ ] Test reporting
- [ ] Coverage badges

---

## 🐛 Debugging Tests

```bash
# Run specific test with debug output
cd backend && npm test -- --verbose routes.test.ts

# Run with coverage report
cd backend && npm run test:coverage

# Debug specific test
cd backend && node --inspect-brk node_modules/.bin/jest routes.test.ts

# Check database state during tests
# Add to test: console.log(await prisma.workflow.findMany())
```

---

## 📝 Test Data

### Test Users
```typescript
const testUsers = {
  admin: { email: 'admin@test.com', role: 'admin' },
  user: { email: 'user@test.com', role: 'user' },
  viewer: { email: 'viewer@test.com', role: 'user' }
};
```

### Test Workflows
```typescript
const testWorkflows = {
  simple: { name: 'Simple', nodes: [], connections: [] },
  withData: { name: 'With Data', nodes: [...], connections: [...] }
};
```

---

## 🔗 Related Files

- [ROUTE_COVERAGE.md](./ROUTE_COVERAGE.md) - API coverage analysis
- [backend/src/__tests__/](./backend/src/__tests__/) - Test files
- [backend/jest.config.js](./backend/jest.config.js) - Jest configuration

---

*Last updated: March 21, 2026*
