# OrdoVertex API Documentation

Base URL: `http://localhost:3001/api` (development) or your production domain.

## Authentication

All API endpoints (except `/auth/*`) require authentication via Bearer token or API key.

### Bearer Token (JWT)
```http
Authorization: Bearer <jwt_token>
```

### API Key
```http
X-API-Key: <api_key>
```

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

---

## Workflow Routes

### GET /workflows
List all workflows for current user.

**Response:**
```json
{
  "success": true,
  "data": [
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
  ]
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

### GET /credentials/:id
Get credential details (without encrypted data).

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

### GET /workspaces
List all workspaces for current user.

### POST /workspaces
Create a new workspace.

**Request Body:**
```json
{
  "name": "My Workspace",
  "description": "Description"
}
```

### GET /workspaces/:id
Get workspace details.

### PATCH /workspaces/:id
Update workspace.

### DELETE /workspaces/:id
Delete workspace.

### POST /workspaces/:id/members
Add member to workspace.

**Request Body:**
```json
{
  "userId": "uuid",
  "role": "editor"  // owner, admin, editor, viewer
}
```

### PATCH /workspaces/:id/members/:memberId
Update member role.

### DELETE /workspaces/:id/members/:memberId
Remove member from workspace.

### GET /workspaces/:id/workflows
List workflows in workspace.

---

## API Key Routes

### GET /api-keys
List all API keys for current user.

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

*For detailed node documentation, see [AI_WORKFLOW_GUIDE.md](AI_WORKFLOW_GUIDE.md)*
