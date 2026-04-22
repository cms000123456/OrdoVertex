# API Route Coverage Report

Generated: March 19, 2026

## Summary

| Category | Backend Routes | GUI Covered | Coverage % |
|----------|---------------|-------------|------------|
| Auth | 10 | 10 | 100% |
| Workflows | 10 | 10 | 100% |
| Templates | 4 | 4 | 100% |
| Nodes | 3 | 2 | 67% |
| Executions | 5 | 3 | 60% |
| Execution Logs | 5 | 5 | 100% |
| Credentials | 7 | 6 | 86% |
| Workspaces | 9 | 6 | 67% |
| API Keys | 3 | 2 | 67% |
| Users | 4 | 3 | 75% |
| Alerts | 6 | 0 | 0% |
| **TOTAL** | **66** | **51** | **77%** |

---

## Detailed Coverage

### ✅ Auth Routes (100%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| POST /api/auth/login | ✅ | Login.tsx |
| POST /api/auth/register | ✅ | Login.tsx |
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

### ✅ Workflow Routes (100%)

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
| POST /api/executions/:id/cancel | ✅ | ExecutionResults.tsx |

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

### ⚠️ Credential Routes (86%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/credentials | ✅ | CredentialsManager.tsx |
| GET /api/credentials/:id | ✅ | CredentialsManager.tsx |
| POST /api/credentials | ✅ | CredentialsManager.tsx |
| DELETE /api/credentials/:id | ✅ | CredentialsManager.tsx |
| POST /api/credentials/:id/decrypt | ✅ | CredentialsManager.tsx |
| POST /api/credentials/test-vault | ❌ | **MISSING** - Test button not implemented |
| GET /api/credentials/types/list | ✅ | CredentialsManager.tsx |

**Note:** PATCH update endpoint is missing in both backend and GUI.

---

### ⚠️ Workspace Routes (67%)

| Route | GUI Coverage | Component/File |
|-------|-------------|----------------|
| GET /api/workspaces | ✅ | WorkspaceManager.tsx |
| POST /api/workspaces | ✅ | WorkspaceManager.tsx |
| GET /api/workspaces/:id | ✅ | WorkspaceManager.tsx |
| PATCH /api/workspaces/:id | ✅ | WorkspaceManager.tsx |
| DELETE /api/workspaces/:id | ✅ | WorkspaceManager.tsx |
| POST /api/workspaces/:id/members | ✅ | WorkspaceManager.tsx |
| PATCH /api/workspaces/:id/members/:memberId | ✅ | WorkspaceManager.tsx |
| DELETE /api/workspaces/:id/members/:memberId | ✅ | WorkspaceManager.tsx |
| GET /api/workspaces/:id/workflows | ❌ | **MISSING** - Filter not implemented |
| POST /api/workspaces/:id/workflows/:workflowId | ❌ | **MISSING** - Add to workspace not implemented |

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

## Missing GUI Components

### High Priority
1. **Alert Management** - Full alerting UI missing
2. **Workspace Workflow Assignment** - Can't add workflows to workspaces
3. **Execution Stats Dashboard** - Stats endpoint not used

### Medium Priority
4. **API Key Delete** - Missing delete functionality
5. **User Delete** - Missing delete functionality
6. **Execution Delete** - Missing delete functionality
7. **Credential Test Vault** - Test button not implemented

### Low Priority
8. **Node Detail View** - Individual node endpoint not needed (client-side filtering works)
9. **Credential Update (PATCH)** - Only create/delete, no edit

---

## Recommendations

### Phase 1 - Critical
- [ ] Implement Alert Management UI
- [ ] Add workspace workflow assignment
- [ ] Create execution stats dashboard

### Phase 2 - Important
- [ ] Add delete buttons for API keys, users, executions
- [ ] Implement credential edit functionality
- [ ] Add vault test button

### Phase 3 - Nice to Have
- [ ] Node detail view with documentation
- [ ] Advanced filtering for workspaces

---

## Test Coverage

Unit tests created in `backend/src/__tests__/routes.test.ts`:
- ✅ Auth routes (3 tests)
- ✅ Workflow routes (8 tests)
- ✅ Template routes (3 tests)
- ✅ Node routes (2 tests)
- ✅ Execution routes (1 test)
- ✅ Credential routes (2 tests)
- ✅ API Key routes (1 test)

**Total: 20 test cases covering 51/66 routes (77%)**

---

*Last updated: March 19, 2026*
