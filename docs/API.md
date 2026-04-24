# OrdoVertex API Documentation

Base URL: `http://localhost:3001/api` (development) or your production domain.

## Authentication

All API endpoints (except `/auth/*` and `/webhook/*`) require authentication via Bearer token or API key.

### Bearer Token (JWT)
```http
Authorization: Bearer <jwt_token>
```

### API Key
```http
X-API-Key: <api_key>
```

API keys can be used on any endpoint that accepts Bearer tokens. The middleware tries JWT first, then falls back to API key authentication.

---

## Auth Routes

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/login
Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "mfaToken": "123456"  // Optional, required if MFA enabled
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "mfaEnabled": false
    },
    "token": "jwt_token_here"
  }
}
```

### GET /auth/me
Get current authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### PATCH /auth/profile
Update user profile.

**Request Body:**
```json
{
  "name": "New Name",
  "email": "new@example.com"
}
```

### POST /auth/change-password
Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

---

## MFA Routes

### POST /auth/mfa/setup
Setup MFA for current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "base32_secret",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["code1", "code2", ...]
  }
}
```

### POST /auth/mfa/verify
Verify MFA code during setup.

**Request Body:**
```json
{
  "token": "123456"
}
```

### POST /auth/mfa/disable
Disable MFA for current user.

**Request Body:**
```json
{
  "password": "current_password",
  "token": "123456"
}
```

### GET /auth/mfa/status
Check MFA status.

### POST /auth/mfa/backup
Verify backup code during login.

### GET /auth/saml/config
Get SAML SSO configuration (admin only).

### POST /auth/saml/config
Create SAML SSO configuration (admin only).

**Request Body:**
```json
{
  "name": "Okta",
  "entryPoint": "https://company.okta.com/app/...",
  "issuer": "ordovertex",
  "cert": "-----BEGIN CERTIFICATE-----...",
  "enabled": true
}
```

### PATCH /auth/saml/config/:id
Update SAML configuration (admin only).

### DELETE /auth/saml/config/:id
Delete SAML configuration (admin only).

### GET /auth/saml/providers
Get list of enabled SAML providers (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Okta",
      "enabled": true
    }
  ]
}
```

### POST /auth/onboarding
Complete initial onboarding (change default admin credentials). Requires authentication.

**Request Body:**
```json
{
  "email": "admin@yourcompany.com",
  "password": "StrongPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* updated user */ },
    "message": "Onboarding completed successfully"
  }
}
```

---

## Workflow Routes

### GET /workflows
List all workflows for current user.

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "uuid",
        "name": "My Workflow",
        "description": "Description",
        "active": false,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "_count": {
          "executions": 5
        }
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0
    }
  }
}
```

### POST /workflows/bulk-delete
Delete multiple workflows at once.

**Request Body:**
```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 3
  }
}
```

### POST /workflows
Create a new workflow.

**Request Body:**
```json
{
  "name": "New Workflow",
  "description": "Description",
  "nodes": [...],
  "connections": [...],
  "settings": {}
}
```

### GET /workflows/:id
Get a specific workflow.

### PATCH /workflows/:id
Update a workflow.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "nodes": [...],
  "connections": [...],
  "active": true
}
```

### DELETE /workflows/:id
Delete a workflow.

### POST /workflows/:id/execute
Execute a workflow manually.

**Request Body:**
```json
{
  "data": {}  // Optional input data
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "message": "Workflow execution queued"
  }
}
```

### GET /workflows/:id/executions
Get executions for a workflow.

### GET /workflows/:id/export
Export workflow as JSON file.

### POST /workflows/import
Import workflow from JSON.

**Request Body:**
```json
{
  "workflow": { /* workflow object */ },
  "name": "Imported Workflow Name"  // Optional
}
```

### POST /workflows/import/validate
Validate workflow import without saving.

**Request Body:** Same as import.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["Node 'X' has no connection"]
  }
}
```

### POST /workflows/:id/move
Move workflow to a different workspace (or personal).

**Request Body:**
```json
{
  "workspaceId": "workspace-uuid"  // null to move to personal
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow moved to workspace",
  "data": { /* updated workflow */ }
}
```

### GET /workflows/:id/executions/:executionId
Get a specific execution of a workflow.

**Response:**
```json
{
  "success": true,
  "data": { /* execution details */ }
}
```

---

## Execution Routes

### GET /executions
List all executions.

**Query Parameters:**
- `workflowId` - Filter by workflow
- `status` - Filter by status (running, success, failed, waiting, canceled)
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset

### GET /executions/stats
Get execution statistics.

### GET /executions/:id
Get execution details.

### DELETE /executions/:id
Delete an execution.

### POST /executions/:id/cancel
Cancel a running execution.

### GET /executions/:executionId/nodes/:nodeId
Get execution details for a specific node within an execution.

**Response:**
```json
{
  "success": true,
  "data": { /* node execution details */ }
}
```

---

## Execution Log Routes

### GET /execution-logs
Get execution logs with filtering.

**Query Parameters:**
- `executionId` - Filter by execution
- `level` - Filter by log level (debug, info, warn, error)
- `nodeId` - Filter by node
- `limit` - Number of results
- `offset` - Pagination offset

### GET /execution-logs/execution/:id
Get logs for specific execution.

### GET /execution-logs/stats/overview
Get log statistics overview.

### GET /execution-logs/timeline
Get execution timeline data.

### GET /execution-logs/export
Export logs as JSON or CSV.

---

## Template Routes

### GET /templates
List all workflow templates.

**Query Parameters:**
- `category` - Filter by category
- `search` - Search by name/description

### GET /templates/:id
Get template details.

### POST /templates/:id/create
Create workflow from template.

**Request Body:**
```json
{
  "name": "My Workflow from Template",
  "description": "Optional custom description"
}
```

### GET /templates/categories/list
List all template categories.

---

## Node Routes

### GET /nodes
List all available nodes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "http-request",
      "displayName": "HTTP Request",
      "description": "Make HTTP requests",
      "category": "Actions",
      "icon": "Globe",
      "inputs": [...],
      "outputs": [...],
      "parameters": {...}
    }
  ]
}
```

### GET /nodes/categories
List node categories.

### GET /nodes/:name
Get details for a specific node.

---

## Credential Routes

### GET /credentials
List all credentials for current user.

**Query Parameters:**
- `type` - Filter by credential type
- `workspaceId` - Filter by workspace
- `includeShared` - Include workspace-shared credentials (`true`/`false`)
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "credentials": [...],
    "pagination": { "total": 15, "limit": 20, "offset": 0 }
  }
}
```

### GET /credentials/:id
Get credential details (without encrypted data).

### POST /credentials/bulk-delete
Delete multiple credentials at once.

**Request Body:**
```json
{
  "ids": ["uuid-1", "uuid-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 2
  }
}
```

### POST /credentials
Create a new credential.

**Request Body:**
```json
{
  "name": "My Database",
  "type": "database",
  "data": {
    "host": "localhost",
    "port": 5432,
    "username": "user",
    "password": "pass"
  },
  "workspaceId": "uuid"  // Optional
}
```

### PUT /credentials/:id
Update a credential.

**Request Body:** Same as POST /credentials.

### DELETE /credentials/:id
Delete a credential.

### POST /credentials/:id/decrypt
Decrypt and retrieve credential data.

### GET /credentials/types/list
List available credential types.

### POST /credentials/test-vault
Test HashiCorp Vault connection.

---

## Workspace Routes

Workspaces enable team collaboration by allowing multiple users to share workflows, credentials, and executions.

### Workspace Roles
- **owner** - Full control, can delete workspace
- **admin** - Manage members and settings
- **editor** - Create/edit workflows and credentials
- **viewer** - View-only access

### GET /workspaces
List all workspaces for current user (owned or member).

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Engineering Team",
      "slug": "engineering-team-abc123",
      "description": "Shared workflows for engineering",
      "ownerId": "uuid",
      "owner": { "id": "uuid", "name": "John", "email": "john@example.com" },
      "members": [...],
      "_count": { "workflows": 5, "members": 3 }
    }
  ],
  "pagination": { "total": 5, "limit": 20, "offset": 0 }
}
```

### POST /workspaces
Create a new workspace.

**Request Body:**
```json
{
  "name": "My Team Workspace",
  "description": "Shared automation workflows"
}
```

### GET /workspaces/:id
Get workspace details including members and workflows.

### PATCH /workspaces/:id
Update workspace (requires admin/owner role).

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### DELETE /workspaces/:id
Delete workspace (owner only).

### POST /workspaces/:id/members
Invite member by email to workspace.

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "editor"
}
```

**Roles:** `owner`, `admin`, `editor`, `viewer`

### PATCH /workspaces/:id/members/:memberId
Update member role (owner only).

**Request Body:**
```json
{
  "role": "admin"
}
```

### DELETE /workspaces/:id/members/:memberId
Remove member from workspace.

### GET /workspaces/:id/workflows
List workflows in workspace.

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 12, "limit": 20, "offset": 0 }
}
```

### POST /workspaces/:id/workflows/:workflowId
Add workflow to workspace (requires editor+ role).

---

## API Key Routes

### GET /api-keys
List all API keys for current user.

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKeys": [...],
    "pagination": { "total": 3, "limit": 20, "offset": 0 }
  }
}
```

### POST /api-keys
Create a new API key.

**Request Body:**
```json
{
  "name": "My API Key",
  "expiresAt": "2024-12-31T23:59:59Z"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My API Key",
    "key": "ordovertex_xxxxxxxxx",  // Only shown once
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api-keys/:id
Revoke an API key.

---

## User Routes (Admin Only)

### GET /users
List all users (admin only).

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": { "total": 25, "limit": 20, "offset": 0 }
  }
}
```

### POST /users
Create a new user (admin only).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "user"  // or "admin"
}
```

### PATCH /users/:id
Update user (admin only).

### PATCH /users/:id/role
Change user role (admin only).

### DELETE /users/:id
Delete user (admin only).

---

## Alert Routes

### GET /alerts
List all alerts for current user.

**Query Parameters:**
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 8, "limit": 20, "offset": 0 }
}
```

### POST /alerts
Create a new alert.

**Request Body:**
```json
{
  "name": "High Error Rate",
  "type": "execution_failure_rate",
  "condition": {
    "threshold": 5,
    "timeWindow": 3600
  },
  "actions": [
    {
      "type": "email",
      "config": {
        "to": "admin@example.com"
      }
    }
  ]
}
```

### GET /alerts/:id
Get alert details.

### PATCH /alerts/:id
Update alert.

### DELETE /alerts/:id
Delete alert.

### POST /alerts/:id/test
Test alert notification.

### GET /alerts/:id/history
Get alert history.

---

## Webhook Routes

### POST /webhooks/:workflowId
Trigger workflow via webhook.

**No authentication required** (uses workflow ID as secret).

**Request:**
Any JSON body is accepted and passed to the workflow.

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "message": "Webhook triggered successfully"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": 400,
    "details": []  // Validation errors if applicable
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Rate Limits

- **Authentication**: 5 attempts per 15 minutes (production) / 100 per minute (development)
- **API Requests**: 60 per minute
- **Webhook**: 120 per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700000000
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

### Create Workflow
```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Workflow","nodes":[],"connections":[]}'
```

### Execute Workflow
```bash
curl -X POST http://localhost:3001/api/workflows/WORKFLOW_ID/execute \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Groups

Groups allow organizing users and assigning permissions across multiple workspaces.

### GET /groups
List all groups accessible to the current user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Engineering Team",
      "description": "Engineering department users",
      "workspaceId": null,
      "workspaces": [{ "id": "uuid", "name": "Workspace Name" }],
      "members": [{ "userId": "uuid", "role": "member" }],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /groups
Create a new group.

**Request Body:**
```json
{
  "name": "Engineering Team",
  "description": "Engineering department users",
  "workspaceIds": ["uuid1", "uuid2"],
  "memberIds": ["user-uuid1", "user-uuid2"]
}
```

### GET /groups/workspace/:workspaceId
Get groups for a specific workspace.

### PATCH /groups/:id
Update group details.

### DELETE /groups/:id
Delete a group.

### POST /groups/:id/members
Add a member to a group.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "role": "member"
}
```

### DELETE /groups/:id/members/:memberId
Remove a member from a group.

### POST /groups/:id/workspaces
Add workspace access to a group.

**Request Body:**
```json
{
  "workspaceId": "workspace-uuid",
  "role": "editor"
}
```

### DELETE /groups/:id/workspaces/:accessId
Remove workspace access from a group.

---

## System (Admin Only)

System administration endpoints. Requires admin role.

### GET /system/stats
Get system statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "counts": {
      "workflows": 150,
      "executions": 5000,
      "users": 25,
      "executionLogs": 10000,
      "nodeExecutions": 25000
    },
    "database": {
      "size": "1.2 GB",
      "tables": [...]
    }
  }
}
```

### GET /system/maintenance
Get database maintenance settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "executionLogsRetention": 30,
    "workflowExecutionsRetention": 90,
    "apiRequestLogsRetention": 7,
    "enableAutoPurge": true,
    "purgeSchedule": "0 2 * * *",
    "lastPurgeRun": "2024-01-01T02:00:00Z",
    "nextPurgeRun": "2024-01-02T02:00:00Z"
  }
}
```

### PATCH /system/maintenance
Update maintenance settings.

**Request Body:**
```json
{
  "executionLogsRetention": 30,
  "workflowExecutionsRetention": 90,
  "apiRequestLogsRetention": 7,
  "enableAutoPurge": true,
  "purgeSchedule": "0 2 * * *"
}
```

### POST /system/maintenance/purge
Manually trigger database purge.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Purge completed successfully",
    "results": {
      "executionLogs": 1500,
      "workflowExecutions": 300,
      "nodeExecutions": 900
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### GET /system/security
Get security settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "requireCodeNodeApproval": false,
    "sessionTimeout": 60,
    "maxLoginAttempts": 5,
    "requireEmailVerification": false
  }
}
```

### PATCH /system/security
Update security settings.

**Request Body:**
```json
{
  "requireCodeNodeApproval": true,
  "sessionTimeout": 60,
  "maxLoginAttempts": 5,
  "requireEmailVerification": false
}
```

### GET /system/maintenance/purge-preview
Preview what data would be purged by maintenance.

**Response:**
```json
{
  "success": true,
  "data": {
    "logsToDelete": 1500,
    "executionsToDelete": 300,
    "estimatedStorage": "45MB"
  }
}
```

### GET /system/email
Get email/SMTP configuration.

### PATCH /system/email
Update email/SMTP configuration.

### POST /system/email/test
Send a test email to verify configuration.

### GET /system/general
Get general system settings (site name, theme, registration, default role).

### PATCH /system/general
Update general system settings.

---

## Admin Routes

Admin-only endpoints for system management.

### GET /admin/workflows
List all workflows across all users.

### DELETE /admin/workflows/:id
Delete any workflow.

### POST /admin/workflows/:id/move
Move workflow to a different workspace (or personal).

**Request Body:**
```json
{
  "workspaceId": "workspace-uuid"  // null to move to personal
}
```

### PATCH /admin/workflows/:id/toggle
Toggle workflow active/inactive state.

### GET /admin/system-stats
Get server system statistics (CPU, memory, disk).

---

## App Logs (Admin Only)

View application log files for troubleshooting.

### GET /logs
List available log files.

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "api.log",
        "size": 1024000,
        "modified": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

### GET /logs/:logName
View log file content.

**Query Parameters:**
- `lines` - Number of lines to return (default: 100, max: 1000)

### GET /logs/:logName/download
Download log file.

### DELETE /logs/:logName
Delete a log file.

---

## Queue (Admin Only)

Monitor and manage the BullMQ job queue.

### GET /queue/stats
Get queue statistics (job counts, worker status).

**Response:**
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 1
  }
}
```

### GET /queue/failed
List failed jobs.

### POST /queue/failed/:jobId/retry
Retry a failed job.

### DELETE /queue/failed/:jobId
Remove a failed job from the queue.

---

## Scheduler (Admin Only)

Manage scheduled workflow triggers.

### GET /scheduler/status
Get scheduler health and trigger count.

**Response:**
```json
{
  "success": true,
  "data": {
    "active": true,
    "triggerCount": 12,
    "lastRun": "2026-04-24T10:00:00Z"
  }
}
```

### GET /scheduler/triggers
List all scheduled triggers.

**Query Parameters:**
- `enabled` - Filter to enabled triggers only (`true`)
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "triggers": [...],
    "pagination": { "total": 12, "limit": 20, "offset": 0 }
  }
}
```

### PATCH /scheduler/triggers/:id
Update a scheduled trigger (enable/disable, change cron).

### POST /scheduler/triggers/:id/run
Manually trigger a scheduled workflow run.

---

*For detailed node documentation, see [AI_WORKFLOW_GUIDE.md](AI_WORKFLOW_GUIDE.md)*
