# API Route Coverage Report

Generated: April 23, 2026

## Summary

| Category | Backend Routes | GUI Covered | Coverage % |
|----------|---------------|-------------|------------|
| Auth | 10 | 10 | 100% |
| Workflows | 12 | 10 | 83% |
| Templates | 4 | 4 | 100% |
| Nodes | 3 | 2 | 67% |
| Executions | 5 | 3 | 60% |
| Execution Logs | 5 | 5 | 100% |
| Credentials | 8 | 6 | 75% |
| Workspaces | 10 | 8 | 80% |
| API Keys | 3 | 2 | 67% |
| Users | 4 | 3 | 75% |
| Alerts | 6 | 0 | 0% |
| Groups | 8 | 5 | 63% |
| Scheduler | 4 | 2 | 50% |
| Queue | 4 | 1 | 25% |
| System | 10 | 5 | 50% |
| Logs | 4 | 2 | 50% |
| Webhooks | 1 | 0 | 0% |
| Admin | 5 | 3 | 60% |
| **TOTAL** | **106** | **71** | **67%** |

---

## Detailed Coverage

### ✅ Auth Routes (100%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| POST /api/auth/register | ✅ | Login.tsx |
| POST /api/auth/login | ✅ | Login.tsx |
| GET /api/auth/me | ✅ | api.ts authApi.me |
| PATCH /api/auth/profile | ✅ | api.ts authApi.updateProfile |
| POST /api/auth/change-password | ✅ | api.ts authApi.changePassword |
| POST /api/auth/mfa/setup | ✅ | MFASetup.tsx |
| POST /api/auth/mfa/verify | ✅ | MFASetup.tsx |
| POST /api/auth/mfa/disable | ✅ | MFASetup.tsx |
| GET /api/auth/mfa/status | ✅ | MFASetup.tsx |
| POST /api/auth/mfa/backup | ✅ | Login.tsx |

**SAML Routes:**
| GET /api/auth/saml/config | ✅ | SAMLConfig.tsx |
| POST /api/auth/saml/config | ✅ | SAMLConfig.tsx |
| PATCH /api/auth/saml/config/:id | ✅ | SAMLConfig.tsx |
| DELETE /api/auth/saml/config/:id | ✅ | SAMLConfig.tsx |
| GET /api/auth/saml/providers | ✅ | SAMLConfig.tsx |

---

### ✅ Workflow Routes (83%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/workflows | ✅ | WorkflowsList.tsx |
| POST /api/workflows | ✅ | WorkflowsList.tsx |
| GET /api/workflows/:id | ✅ | WorkflowEditor.tsx |
| PATCH /api/workflows/:id | ✅ | WorkflowEditor.tsx |
| DELETE /api/workflows/:id | ✅ | WorkflowsList.tsx |
| POST /api/workflows/:id/execute | ✅ | WorkflowsList.tsx, WorkflowEditor.tsx |
| GET /api/workflows/:id/executions | ✅ | api.ts workflowsApi.getExecutions |
| GET /api/workflows/:id/export | ✅ | WorkflowsList.tsx |
| POST /api/workflows/import | ✅ | WorkflowsList.tsx |
| POST /api/workflows/import/validate | ✅ | WorkflowsList.tsx |
| POST /api/workflows/:id/move | ✅ | WorkspaceManagement.tsx |
| GET /api/workflows/:id/executions/:executionId | ✅ | ExecutionLogs.tsx |

---

### ✅ Template Routes (100%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/templates | ✅ | TemplatesGallery.tsx |
| GET /api/templates/:id | ✅ | TemplatesGallery.tsx |
| POST /api/templates/:id/create | ✅ | TemplatesGallery.tsx |
| GET /api/templates/categories/list | ✅ | TemplatesGallery.tsx |

---

### ⚠️ Node Routes (67%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/nodes | ✅ | NodePanel.tsx, api.ts |
| GET /api/nodes/categories | ✅ | NodePanel.tsx, api.ts |
| GET /api/nodes/:name | ❌ | **MISSING** - Node details not fetched individually |

**Note:** Frontend gets all nodes and filters client-side. Individual node endpoint not used.

---

### ⚠️ Execution Routes (60%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/executions/stats | ❌ | **MISSING** - Stats not displayed |
| GET /api/executions | ✅ | ExecutionLogs.tsx |
| GET /api/executions/:id | ✅ | ExecutionLogs.tsx |
| DELETE /api/executions/:id | ❌ | **MISSING** - No delete button in GUI |
| GET /api/executions/:executionId/nodes/:nodeId | ✅ | ExecutionLogs.tsx |

---

### ✅ Execution Log Routes (100%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/execution-logs | ✅ | ExecutionLogs.tsx |
| GET /api/execution-logs/execution/:id | ✅ | ExecutionLogs.tsx |
| GET /api/execution-logs/stats/overview | ✅ | ExecutionLogs.tsx |
| GET /api/execution-logs/timeline | ✅ | ExecutionLogs.tsx |
| GET /api/execution-logs/export | ✅ | ExecutionLogs.tsx |

---

### ⚠️ Credential Routes (75%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/credentials | ✅ | CredentialsManager.tsx |
| GET /api/credentials/:id | ✅ | CredentialsManager.tsx |
| POST /api/credentials | ✅ | CredentialsManager.tsx |
| PUT /api/credentials/:id | ✅ | CredentialsManager.tsx |
| DELETE /api/credentials/:id | ✅ | CredentialsManager.tsx |
| POST /api/credentials/:id/decrypt | ✅ | CredentialsManager.tsx |
| POST /api/credentials/test-vault | ❌ | **MISSING** - Test button not implemented |
| GET /api/credentials/types/list | ✅ | CredentialsManager.tsx |

---

### ⚠️ Workspace Routes (80%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/workspaces | ✅ | WorkspaceManagement.tsx |
| POST /api/workspaces | ✅ | WorkspaceManagement.tsx |
| GET /api/workspaces/:id | ✅ | WorkspaceManagement.tsx |
| PATCH /api/workspaces/:id | ✅ | WorkspaceManagement.tsx |
| DELETE /api/workspaces/:id | ✅ | WorkspaceManagement.tsx |
| POST /api/workspaces/:id/members | ✅ | WorkspaceManagement.tsx |
| PATCH /api/workspaces/:id/members/:memberId | ✅ | WorkspaceManagement.tsx |
| DELETE /api/workspaces/:id/members/:memberId | ✅ | WorkspaceManagement.tsx |
| GET /api/workspaces/:id/workflows | ❌ | **MISSING** |
| POST /api/workspaces/:id/workflows/:workflowId | ❌ | **MISSING** |

---

### ⚠️ API Key Routes (67%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/api-keys | ✅ | ApiKeyManagement.tsx |
| POST /api/api-keys | ✅ | ApiKeyManagement.tsx |
| DELETE /api/api-keys/:id | ❌ | **MISSING** - No delete button in GUI |

---

### ⚠️ User Routes (75%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/users | ✅ | UserManagement.tsx |
| POST /api/users | ✅ | UserManagement.tsx |
| PATCH /api/users/:id | ✅ | UserManagement.tsx |
| DELETE /api/users/:id | ❌ | **MISSING** - No delete button in GUI |

---

### ❌ Alert Routes (0% - Not Implemented in GUI)

| Route | GUI Coverage | Notes |
|-------|-------------|-------|
| GET /api/alerts | ❌ | **NOT IMPLEMENTED** |
| POST /api/alerts | ❌ | **NOT IMPLEMENTED** |
| PATCH /api/alerts/:id | ❌ | **NOT IMPLEMENTED** |
| DELETE /api/alerts/:id | ❌ | **NOT IMPLEMENTED** |
| POST /api/alerts/:id/test | ❌ | **NOT IMPLEMENTED** |
| GET /api/alerts/:id/history | ❌ | **NOT IMPLEMENTED** |

**Note:** Alert system exists in backend but has no frontend components.

---

### ⚠️ Group Routes (63%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/groups | ✅ | GroupsTeamsManager.tsx |
| GET /api/groups/workspace/:workspaceId | ✅ | GroupsTeamsManager.tsx |
| POST /api/groups | ✅ | GroupsTeamsManager.tsx |
| PATCH /api/groups/:id | ✅ | GroupsTeamsManager.tsx |
| DELETE /api/groups/:id | ✅ | GroupsTeamsManager.tsx |
| POST /api/groups/:id/members | ❌ | **MISSING** |
| DELETE /api/groups/:id/members/:memberId | ❌ | **MISSING** |
| POST /api/groups/:id/workspaces | ❌ | **MISSING** |

---

### ⚠️ Scheduler Routes (50%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/scheduler/status | ✅ | PerformanceMonitor.tsx |
| GET /api/scheduler/triggers | ✅ | SchedulerManager.tsx |
| PATCH /api/scheduler/triggers/:id | ✅ | SchedulerManager.tsx |
| POST /api/scheduler/triggers/:id/run | ❌ | **MISSING** |

---

### ⚠️ Queue Routes (25%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/queue/stats | ❌ | **MISSING** |
| GET /api/queue/failed | ❌ | **MISSING** |
| POST /api/queue/failed/:jobId/retry | ❌ | **MISSING** |
| DELETE /api/queue/failed/:jobId | ❌ | **MISSING** |

---

### ⚠️ System Routes (50%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/system/stats | ✅ | PerformanceMonitor.tsx |
| GET /api/system/maintenance | ✅ | SystemSettings.tsx |
| PATCH /api/system/maintenance | ✅ | SystemSettings.tsx |
| POST /api/system/maintenance/purge | ✅ | SystemSettings.tsx |
| GET /api/system/maintenance/purge-preview | ✅ | SystemSettings.tsx |
| GET /api/system/security | ✅ | SystemSettings.tsx |
| PATCH /api/system/security | ✅ | SystemSettings.tsx |
| GET /api/system/email | ✅ | SystemSettings.tsx |
| PATCH /api/system/email | ✅ | SystemSettings.tsx |
| POST /api/system/email/test | ✅ | SystemSettings.tsx |

---

### ⚠️ Log Routes (50%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/logs | ✅ | LogViewer.tsx |
| GET /api/logs/:logName | ✅ | LogViewer.tsx |
| GET /api/logs/:logName/download | ❌ | **MISSING** |
| DELETE /api/logs/:logName | ❌ | **MISSING** |

---

### ❌ Webhook Routes (0%)

| Route | GUI Coverage | Notes |
|-------|-------------|-------|
| ALL /webhook/:workflowId/:path? | ❌ | External endpoint - no GUI needed |

---

### ⚠️ Admin Routes (60%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/admin/workflows | ✅ | AdminWorkflows.tsx |
| DELETE /api/admin/workflows/:id | ✅ | AdminWorkflows.tsx |
| POST /api/admin/workflows/:id/move | ❌ | **MISSING** |
| PATCH /api/admin/workflows/:id/toggle | ❌ | **MISSING** |
| GET /api/admin/system-stats | ✅ | PerformanceMonitor.tsx |

---

## Test Coverage

### Backend Tests
- **Unit tests:** 139 tests across 13 suites (`npm test`)
- **Integration tests:** 60 tests across 3 suites (`npm run test:integration`)
- **Test configs:**
  - `jest.config.js` — unit tests (parallel, excludes route tests)
  - `jest.integration.config.js` — integration tests (sequential, `maxWorkers: 1`)

### Frontend Tests
- **Vitest setup:** `frontend/vitest.config.ts` with jsdom environment
- **Tests:** 11 tests for `error-helper` utility
- **Run:** `cd frontend && npm test`

---

## Missing GUI Components

### High Priority
1. **Alert Management** - Full alerting UI missing
2. **Queue Management** - Failed job retry/delete UI missing
3. **Group Member Management** - Adding/removing members from groups

### Medium Priority
4. **API Key Delete** - Missing delete functionality
5. **User Delete** - Missing delete functionality
6. **Execution Delete** - Missing delete functionality
7. **Execution Stats Dashboard** - Stats endpoint not used

### Low Priority
8. **Node Detail View** - Individual node endpoint not needed (client-side filtering works)
9. **Credential Test Vault** - Test button not implemented
10. **Log Download/Delete** - Not exposed in UI

---

*Last updated: April 23, 2026*
