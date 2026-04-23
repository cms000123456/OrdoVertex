# OrdoVertex Test Scheme v3.0

> Comprehensive testing plan with automated pre-push validation.

## 📊 Quick Status

| Component | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| Backend Utils | 139 | 🟢 Good | Utilities covered |
| Integration (Routes) | 60 | 🟢 Good | 3 test suites |
| Frontend Utils | 11 | 🟡 Starting | error-helper covered |
| E2E | 0 | 🔴 Missing | Not implemented |

---

## 🎯 Testing Philosophy

**Test Before Push**: Every push must pass:
1. ✅ TypeScript compilation (backend + frontend)
2. ✅ Backend unit tests
3. ✅ Database schema validation
4. ✅ Frontend build test

---

## 🚀 Quick Start

```bash
# Backend unit tests (139 tests, ~3s)
cd backend && npm test

# Backend integration tests (60 tests, ~5s, requires DB)
cd backend && npm run test:integration

# Frontend tests (11 tests, ~0.5s)
cd frontend && npm test

# Full pre-push suite
cd backend && npm run test:pre-push
```

---

## 📁 Test Structure

```
backend/src/__tests__/
├── setup.ts                    # Shared PrismaClient, global cleanup
├── utils/
│   ├── async-handler.test.ts   # Express async wrapper
│   ├── auth.test.ts            # JWT, password hashing
│   ├── email-sender.test.ts    # SMTP fallback
│   ├── encryption.test.ts      # AES-256-GCM roundtrip
│   ├── env-validation.test.ts  # Startup env checks
│   ├── error-helper.test.ts    # Safe error extraction
│   ├── logger.test.ts          # Winston transport
│   ├── rate-limit.test.ts      # In-memory rate limiter
│   ├── response.test.ts        # JSON response helpers
│   ├── safe-eval.test.ts       # Expression validator
│   ├── security.test.ts        # SSRF, input sanitization
│   └── smb-client.test.ts      # Path validation, auth file
├── data/
│   └── templates.test.ts       # Template data integrity
└── routes/
    ├── templates.test.ts       # Template CRUD
    └── workspaces.test.ts      # Workspace CRUD + members

backend/src/__tests__/routes.test.ts   # Main integration test (23 route groups)

frontend/src/__tests__/
├── setup.ts                         # vitest + jest-dom setup
└── utils/
    └── error-helper.test.ts         # getErrorMessage, getAxiosErrorData
```

---

## 🧪 Test Categories

### 1. Unit Tests (Backend)

#### Utils — All Passing
```
✅ async-handler     — Wraps async routes, forwards errors
✅ auth              — bcrypt hashing, JWT sign/verify, token expiry
✅ email-sender      — SMTP not configured fallback
✅ encryption        — AES-256-GCM encrypt/decrypt, IV uniqueness
✅ env-validation    — Missing vars, weak JWT_SECRET, invalid URLs
✅ error-helper      — getErrorMessage, getErrorStack
✅ logger            — Winston transports, log stream
✅ rate-limit        — Window expiry, count tracking, cleanup interval
✅ response          — successResponse, errorResponse
✅ safe-eval         — validateExpression, math eval, condition eval
✅ security          — isInternalUrl, sanitizeInput, safeIdentifier
✅ smb-client        — validateSmbPath, withAuthFile permissions
```

### 2. Integration Tests

#### Routes (sequential, `maxWorkers: 1`)
```
✅ routes.test.ts           — Health, auth, workflows, templates,
                              nodes, executions, credentials, api-keys
✅ routes/templates.test.ts — Template list, categories, create from template
✅ routes/workspaces.test.ts — CRUD, members, workflow move
```

**Run:** `cd backend && npm run test:integration`

### 3. Frontend Tests

#### Utils
```
✅ error-helper — getErrorMessage (string, Error, axios, null)
✅ error-helper — getAxiosErrorData (full, partial, missing)
```

**Run:** `cd frontend && npm test`

---

## 🔒 Security Tests

Backend unit tests cover:
- ✅ SSRF blocking (localhost, private ranges, metadata endpoints)
- ✅ Input sanitization (scripts, javascript:, event handlers, null bytes)
- ✅ Safe identifier validation
- ✅ Expression validation (blocked keywords, quotes, backslashes)
- ✅ Encryption roundtrip with auth tag verification
- ✅ Rate limiter cleanup (`.unref()` prevents Jest hangs)
- ✅ SMB path forbidden characters

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

# 3. Backend unit tests (excludes integration tests)
echo "Running backend unit tests..."
cd backend && npm test -- --testPathIgnorePatterns=routes --silent || exit 1
cd ..

# 4. Frontend build test
echo "Testing frontend build..."
cd frontend && CI=true npm run build || exit 1
cd ..

echo "✅ All pre-push tests passed!"
```

### Install Hook
```bash
chmod +x .git/hooks/pre-push
```

---

## 🛠️ Test Commands

### Backend
```bash
cd backend
npm test                      # Unit tests only (parallel)
npm run test:integration      # Integration tests (sequential)
npm run test:coverage         # Coverage report
npm run test:typecheck        # tsc --noEmit
npm run test:pre-push         # Type check + unit tests
```

### Frontend
```bash
cd frontend
npm test                      # Run vitest
npm test -- --watch           # Watch mode
```

---

## 📈 Coverage Targets

| Component | Status | Priority |
|-----------|--------|----------|
| Auth Utils | ✅ Covered | Done |
| Encryption | ✅ Covered | Done |
| Rate Limiting | ✅ Covered | Done |
| Security Utils | ✅ Covered | Done |
| Error Handling | ✅ Covered | Done |
| Env Validation | ✅ Covered | Done |
| Workflow Routes | ✅ Integration | Done |
| Workspace Routes | ✅ Integration | Done |
| Template Routes | ✅ Integration | Done |
| Frontend Utils | 🟡 Starting | Medium |
| Engine/Executor | 🔴 Not started | Low |
| Scheduler | 🔴 Not started | Low |

---

## 🐛 Debugging Tests

```bash
# Run specific test with verbose output
cd backend && npm test -- --verbose async-handler.test.ts

# Run with coverage report
cd backend && npm run test:coverage

# Debug specific test
cd backend && node --inspect-brk node_modules/.bin/jest async-handler.test.ts

# Check database state during tests
# Add to test: console.log(await prisma.workflow.findMany())
```

---

## 🔗 Related Files

- [ROUTE_COVERAGE.md](./ROUTE_COVERAGE.md) — API to GUI coverage analysis
- [backend/jest.config.js](./backend/jest.config.js) — Unit test config (parallel)
- [backend/jest.integration.config.js](./backend/jest.integration.config.js) — Integration config (sequential)
- [frontend/vitest.config.ts](./frontend/vitest.config.ts) — Frontend test config

---

*Last updated: April 23, 2026*
