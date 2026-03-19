# OrdoVertex Test Scheme

> Comprehensive testing plan for the OrdoVertex workflow automation platform.

## 📊 Current Test Status

| Component | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| Backend API | ✅ Partial | 77% | 23 integration tests |
| Frontend | ❌ Missing | 0% | No tests implemented |
| End-to-End | ❌ Missing | 0% | No E2E tests |
| Security | ❌ Missing | 0% | No penetration tests |
| Performance | ❌ Missing | 0% | No load tests |

---

## 🎯 Test Categories

### 1. Unit Tests

#### Backend (Priority: High)
```
backend/src/
├── utils/
│   ├── auth.test.ts           # JWT, password hashing
│   ├── encryption.test.ts     # AES-256-GCM encryption
│   ├── vault.test.ts          # Credential vault operations
│   ├── rate-limit.test.ts     # Rate limiting logic
│   └── email-sender.test.ts   # Email functionality
├── engine/
│   ├── executor.test.ts       # Workflow execution
│   ├── scheduler.test.ts      # Cron scheduling
│   └── queue.test.ts          # BullMQ queue operations
└── nodes/
    └── [each node].test.ts    # Individual node execution
```

**Required Tests:**
- [ ] **Auth Utils** - Password hashing, JWT generation/verification, token expiry
- [ ] **Encryption** - Encrypt/decrypt roundtrip, IV generation, key validation
- [ ] **Vault** - Store/retrieve credentials, key rotation, error handling
- [ ] **Rate Limit** - Window expiration, count tracking, IP identification
- [ ] **Executor** - Node execution order, error handling, data flow
- [ ] **Scheduler** - Cron parsing, trigger firing, timezone handling
- [ ] **Queue** - Job enqueueing, worker processing, retry logic

#### Frontend (Priority: High)
```
frontend/src/
├── components/
│   ├── WorkflowEditor.test.tsx
│   ├── NodePanel.test.tsx
│   ├── ExecutionLogs.test.tsx
│   └── [each component].test.tsx
├── store/
│   └── workflowSlice.test.ts
└── utils/
    └── api.test.ts
```

**Required Tests:**
- [ ] **Component Rendering** - All components render without errors
- [ ] **User Interactions** - Click handlers, form submissions, drag-and-drop
- [ ] **State Management** - Redux store updates, selectors
- [ ] **API Integration** - Request/response handling, error states

---

### 2. Integration Tests

#### API Routes (Priority: High - Partially Done)
**Existing:** `backend/src/__tests__/routes.test.ts` (23 tests)

**Missing Coverage:**
- [ ] **Auth Extended Routes**
  - PATCH /api/auth/profile
  - POST /api/auth/change-password
  - POST /api/auth/mfa/setup
  - POST /api/auth/mfa/verify
  - POST /api/auth/mfa/disable
  - POST /api/auth/mfa/backup

- [ ] **SAML Routes**
  - GET /api/auth/saml/config
  - POST /api/auth/saml/config
  - PATCH /api/auth/saml/config/:id
  - DELETE /api/auth/saml/config/:id
  - GET /api/auth/saml/providers

- [ ] **Workspace Routes**
  - POST /api/workspaces/:id/members
  - PATCH /api/workspaces/:id/members/:memberId
  - DELETE /api/workspaces/:id/members/:memberId
  - GET /api/workspaces/:id/workflows

- [ ] **User Routes**
  - GET /api/users
  - POST /api/users
  - PATCH /api/users/:id
  - DELETE /api/users/:id

- [ ] **Alert Routes** (Not in GUI)
  - GET /api/alerts
  - POST /api/alerts
  - PATCH /api/alerts/:id
  - DELETE /api/alerts/:id

- [ ] **Webhook Routes**
  - POST /webhook/:workflowId/:path

#### Database Integration (Priority: Medium)
- [ ] **Prisma Operations** - All CRUD operations
- [ ] **Transaction Handling** - Rollback on error
- [ ] **Connection Pooling** - Under load
- [ ] **Migration Testing** - Schema changes

#### External Services (Priority: Medium)
- [ ] **Redis** - Connection, pub/sub, queue operations
- [ ] **Email Provider** - SMTP connection, sending
- [ ] **AI Providers** - OpenAI, Anthropic, Gemini, Kimi API calls
- [ ] **LDAP** - Connection, authentication, search
- [ ] **SFTP** - Connection, file transfer
- [ ] **SQL Databases** - PostgreSQL, MySQL, MSSQL, SQLite connections

---

### 3. Node Tests (Priority: High)

Each node needs isolated testing:

#### Core Nodes
- [ ] **Manual Trigger** - Execution initiation
- [ ] **Schedule** - Cron expression parsing, trigger timing
- [ ] **Webhook** - HTTP request handling, response

#### Action Nodes
- [ ] **HTTP Request** - GET, POST, headers, body, timeout
- [ ] **Code** - JavaScript execution, Python execution, error handling
- [ ] **Set** - Data setting, expressions
- [ ] **IF** - Condition evaluation, branching
- [ ] **Wait** - Delay execution
- [ ] **Split** - Data splitting logic
- [ ] **Aggregate** - Data aggregation

#### Data Nodes
- [ ] **CSV** - Parse/generate, delimiter handling
- [ ] **Filter** - Condition filtering
- [ ] **Sort** - Multi-field sorting
- [ ] **Remove Duplicates** - Field-based deduplication
- [ ] **Date & Time** - Formatting, manipulation
- [ ] **String Operations** - Transformations
- [ ] **Math** - Calculations
- [ ] **Rename Fields** - Field mapping

#### Integration Nodes
- [ ] **SQL Database** - Query execution, parameter binding
- [ ] **Send Email** - SMTP, attachments
- [ ] **SFTP** - Upload, download, list
- [ ] **LDAP** - Search, authentication

#### AI Nodes
- [ ] **AI Agent** - Multi-step reasoning, tool calls, memory
- [ ] **AI Embedding** - Text to vector
- [ ] **AI Vector Store** - Store/search embeddings
- [ ] **Text Splitter** - Chunking strategies

---

### 4. Security Tests (Priority: Critical)

#### Authentication & Authorization
- [ ] **JWT Security**
  - Token expiration handling
  - Invalid signature rejection
  - Algorithm confusion attacks
  - Secret key strength

- [ ] **Password Security**
  - Minimum length enforcement
  - Complexity requirements
  - Bcrypt rounds adequacy
  - Password reset flow

- [ ] **Session Management**
  - Token refresh mechanism
  - Concurrent session handling
  - Logout invalidation

- [ ] **Role-Based Access Control**
  - Admin-only endpoints
  - Workspace permissions
  - Resource ownership

#### Input Validation
- [ ] **SQL Injection** - All database queries
- [ ] **NoSQL Injection** - MongoDB (if used)
- [ ] **XSS Prevention** - Output encoding
- [ ] **CSRF Protection** - Token validation
- [ ] **File Upload** - Type validation, size limits
- [ ] **Path Traversal** - File system access

#### Network Security
- [ ] **SSRF Prevention** - Internal IP blocking (already implemented)
- [ ] **Rate Limiting** - Brute force protection
- [ ] **CORS Configuration** - Origin validation
- [ ] **HTTPS Enforcement** - TLS version, certificates

#### Secret Management
- [ ] **Encryption at Rest** - Credential storage
- [ ] **Key Rotation** - Encryption key updates
- [ ] **Environment Variables** - Secret exposure check

---

### 5. End-to-End Tests (Priority: High)

#### Critical User Flows
```
e2e/tests/
├── auth/
│   ├── login.spec.ts
│   ├── register.spec.ts
│   └── mfa.spec.ts
├── workflows/
│   ├── create.spec.ts
│   ├── edit.spec.ts
│   ├── execute.spec.ts
│   └── delete.spec.ts
├── credentials/
│   ├── create.spec.ts
│   └── use-in-workflow.spec.ts
└── admin/
    ├── user-management.spec.ts
    └── workspace-management.spec.ts
```

**Test Scenarios:**
- [ ] **User Registration** → Login → Create Workflow → Execute → Logout
- [ ] **Admin Flow** → Create User → Create Workspace → Assign Member
- [ ] **Credential Flow** → Store Credential → Use in HTTP Node → Verify Execution
- [ ] **AI Workflow** → Create AI Agent → Configure Tools → Execute Query
- [ ] **Import/Export** → Export Workflow → Import → Verify Integrity

#### Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

### 6. Performance Tests (Priority: Medium)

#### Load Testing
- [ ] **API Endpoints**
  - 100 concurrent requests
  - Response time < 200ms (p95)
  - Error rate < 0.1%

- [ ] **Workflow Execution**
  - 50 concurrent executions
  - Queue processing rate
  - Memory usage under load

- [ ] **WebSocket Connections** (if implemented)
  - 1000 concurrent connections
  - Message broadcast latency

#### Stress Testing
- [ ] **Database Connections** - Pool exhaustion
- [ ] **Redis Memory** - Queue size limits
- [ ] **Worker Crashes** - Recovery time
- [ ] **Large Workflows** - 100+ nodes

#### Benchmarks
```javascript
// Target metrics
const targets = {
  apiResponseTime: { p50: 50, p95: 200, p99: 500 }, // ms
  workflowExecution: { simple: 100, complex: 5000 }, // ms
  throughput: { requestsPerSecond: 1000 },
  concurrentUsers: 100
};
```

---

### 7. Frontend-Specific Tests

#### Component Tests
- [ ] **Workflow Editor**
  - Node dragging
  - Connection creation
  - Zoom/pan
  - Undo/redo
  - Copy/paste

- [ ] **Node Configuration**
  - Form validation
  - Dynamic fields
  - Expression editor
  - Credential selection

- [ ] **Execution Viewer**
  - Real-time updates
  - Log filtering
  - Result display
  - Error highlighting

#### Accessibility (a11y)
- [ ] **Keyboard Navigation** - Tab order, shortcuts
- [ ] **Screen Readers** - ARIA labels
- [ ] **Color Contrast** - WCAG 2.1 AA compliance
- [ ] **Focus Management** - Visible focus indicators

#### Responsive Design
- [ ] **Desktop** - 1920x1080, 1366x768
- [ ] **Tablet** - iPad, Android tablets
- [ ] **Mobile** - iPhone, Android phones (if supported)

---

## 🛠️ Testing Tools

### Backend
```json
{
  "jest": "^29.7.0",
  "supertest": "^6.3.3",
  "@faker-js/faker": "^8.0.0",
  "testcontainers": "^10.0.0"
}
```

### Frontend
```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "vitest": "^1.0.0",
  "cypress": "^13.0.0",
  "playwright": "^1.40.0"
}
```

### Security
- **Snyk** - Dependency vulnerabilities
- **OWASP ZAP** - Web app security scanning
- **npm audit** - Known vulnerabilities

### Performance
- **k6** - Load testing
- **Artillery** - API load testing
- **Lighthouse** - Frontend performance

---

## 📝 Test Data

### Test Fixtures
```
backend/src/__tests__/fixtures/
├── workflows/
│   ├── simple-http.json
│   ├── ai-agent.json
│   └── data-processing.json
├── users/
│   ├── admin.json
│   └── regular-user.json
└── credentials/
    ├── database.json
    └── api-key.json
```

### Mock Services
- [ ] **SMTP Server** - Mailtrap or similar
- [ ] **AI Providers** - Mock responses
- [ ] **LDAP Server** - Test directory
- [ ] **SFTP Server** - Test file transfers

---

## 🚀 CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Backend Tests
        run: cd backend && npm test
      - name: Run Frontend Tests
        run: cd frontend && npm test
  
  integration-tests:
    services:
      postgres:
        image: postgres:16
      redis:
        image: redis:7
    steps:
      - name: Run Integration Tests
        run: npm run test:integration
  
  e2e-tests:
    steps:
      - name: Run E2E Tests
        run: npm run test:e2e
  
  security-scan:
    steps:
      - name: Run Snyk
        run: snyk test
      - name: Run OWASP ZAP
        run: zap-baseline.py -t http://localhost:3001
```

---

## 📈 Coverage Targets

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Backend Unit | 0% | 80% | High |
| Backend Integration | 77% | 90% | High |
| Frontend Unit | 0% | 70% | High |
| E2E Critical Flows | 0% | 100% | High |
| Security | 0% | 100% | Critical |
| Performance | 0% | Baseline | Medium |

---

## 🎯 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Jest for backend unit tests
- [ ] Set up Vitest for frontend
- [ ] Create test utilities and helpers
- [ ] Add test data fixtures

### Phase 2: Backend Coverage (Week 3-4)
- [ ] Unit tests for all utils
- [ ] Complete API route integration tests
- [ ] Node execution tests

### Phase 3: Frontend Coverage (Week 5-6)
- [ ] Component tests for core UI
- [ ] Store/slice tests
- [ ] API integration tests

### Phase 4: Security & E2E (Week 7-8)
- [ ] Security test suite
- [ ] Critical path E2E tests
- [ ] Performance benchmarks

### Phase 5: CI/CD Integration (Week 9)
- [ ] GitHub Actions workflows
- [ ] Coverage reporting
- [ ] Automated security scans

---

## 🔗 Related Documents

- [ROUTE_COVERAGE.md](./ROUTE_COVERAGE.md) - API route coverage analysis
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Security assessment
- [AI_WORKFLOW_GUIDE.md](./AI_WORKFLOW_GUIDE.md) - AI features documentation

---

*Last updated: March 19, 2026*
