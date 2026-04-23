# OrdoVertex 🔥

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **The center of order** - An open-source workflow automation platform. A powerful n8n alternative without limitations.

## 🌟 Features

- **Visual Workflow Editor**: Drag-and-drop interface built with React Flow
- **33+ Built-in Nodes**: HTTP, Code (sandboxed), SQL, Email, CSV, AI Agents, LDAP, Text Parser, Image Display, and more
- **Demo Templates**: Cat/dog images, weather, crypto prices, jokes, AI art - all work without API keys!
- **AI-Powered Workflows**: Multi-provider LLM support (OpenAI, Anthropic, Gemini, Kimi, Ollama)
- **Multiple Trigger Types**: Webhook, Schedule (Cron), Manual, File Watch
- **Team Collaboration**: Workspaces and Groups for sharing workflows and credentials with role-based access
- **Enterprise Security**: SAML SSO, MFA/TOTP, RBAC, Code Sandboxing, Admin Controls
- **Execution Monitoring**: Full logging with input/output data, alerting, and audit trails
- **Database Maintenance**: Automated log purging with configurable retention policies
- **Admin Tools**: System settings, app logs viewer, workflow management
- **Scalable Architecture**: Queue-based execution with BullMQ and Redis
- **Export/Import**: Share workflows as JSON files
- **Docker Ready**: Complete Docker Compose stack for easy deployment

## 📸 Screenshots

### Workflow Editor
The intuitive drag-and-drop interface for building automation workflows:

![Workflow Editor](.screenshots/workflow_window.png)

### Available Nodes

**Triggers** - Start your workflows based on various events:

![Triggers](.screenshots/triggers.png)

**Actions** - Core operations to build your automation:

![Actions](.screenshots/actions.png)

**Code Editor** - Built-in code editor with syntax highlighting for JavaScript and Python:

![Code Editor](.screenshots/code_editor.png)

**Transform** - Data manipulation and processing nodes:

![Transform](.screenshots/transform.png)

**AI** - AI-powered nodes for intelligent automation:

![AI Nodes](.screenshots/ai.png)

**Templates** - Pre-built workflow templates to get started quickly:

![Templates](.screenshots/templates.png)

**Admin Menu** - System administration and management features:

![Admin Menu](.screenshots/admin_menu.png)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OrdoVertex Platform                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   Frontend      │────▶│   API Server    │────▶│   PostgreSQL    │       │
│  │   (React)       │     │   (Express)     │     │   (Database)    │       │
│  │                 │◀────│                 │     │                 │       │
│  │ - React Flow    │     │ - REST API      │     │ - Prisma ORM    │       │
│  │ - Zustand       │     │ - Auth/JWT      │     │ - Workflows     │       │
│  │ - React Query   │     │ - Rate Limiting │     │ - Credentials   │       │
│  └─────────────────┘     └────────┬────────┘     └─────────────────┘       │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌─────────────────┐                                │
│                          │      Redis      │                                │
│                          │   (Queue/Cache) │                                │
│                          └────────┬────────┘                                │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌─────────────────┐                                │
│                          │  Worker Process │                                │
│                          │  (BullMQ)       │                                │
│                          │                 │                                │
│                          │ - Job Queue     │                                │
│                          │ - Scheduling    │                                │
│                          └─────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

## Security Architecture

### Layer 1: Network Security
- **CORS** - Configurable origin restrictions
- **Security Headers** - Helmet.js (CSP, HSTS, X-Frame-Options)
- **Rate Limiting** - 120 req/min (API), 5/15min (auth)

### Layer 2: Authentication
- **JWT** - 24h expiry, configurable
- **bcrypt** - Password hashing
- **MFA/TOTP** - Time-based one-time passwords
- **SAML 2.0** - SSO support (Okta, Azure AD, etc.)

### Layer 3: Authorization
- **RBAC** - Role-based access (Admin/User)
- **Workspaces** - Workspace-level permissions
- **Code Approval** - Optional admin approval for code nodes

### Layer 4: Data Protection
- **AES-256-GCM** - Credential encryption
- **SQL Injection Prevention** - Parameterized queries
- **SSRF Protection** - Internal IPs and cloud metadata blocked

### Layer 5: Execution Sandboxing
- **JavaScript** - vm module (no Node.js APIs)
- **Python** - Import whitelist (25 modules)
- **Static Analysis** - Dangerous pattern blocking
- **Resource Limits** - Timeouts & output limits

---

## 🚀 Quick Start

Get OrdoVertex running in under 5 minutes with Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Git

### 1. Clone & Start

```bash
# Clone the repository
git clone https://github.com/cms000123456/OrdoVertex.git
cd ordovertex

# Start all services
docker-compose up -d

# Wait for services to be ready (usually 30-60 seconds)
docker-compose logs -f api
# When you see "Server running on port 3001", press Ctrl+C to exit logs
```

### 2. Access the Application

Open your browser and go to: **http://localhost:3000**

### 3. First Login

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `admin123` |

> ⚠️ **Security Notice:** You will be required to change your email and password on first login.

### 4. Create Your First Workflow

1. Click **"New Workflow"** on the dashboard
2. Drag nodes from the left panel to the canvas
3. Connect nodes by dragging from output to input
4. Click **"Execute"** to run your workflow

### 📖 Tutorial Workflow (Optional)

Add a pre-built tutorial workflow that demonstrates data flow between nodes:

```bash
# Run the helper script
./add-tutorial.sh

# Or manually with docker:
docker compose exec -w /app api node scripts/add-tutorial-workflow.js
```

This creates a **"📚 Tutorial: Data Flow Demo"** workflow that:
- Generates sample user data
- Transforms/filter the data
- Shows how to use the Node Inspector to view Input/Output data

### 🎮 Demo Templates (No API Keys Required!)

Get started instantly with these fun, pre-built demo templates that work without any configuration:

| Template | Description |
|----------|-------------|
| 🐱 **Cat Fact + Image** | Get random cat facts with cute cat pictures |
| 🐕 **Random Dog Image** | Fetch adorable dog photos with breed info |
| 🌤️ **Weather Lookup** | Current weather for any city (no API key needed) |
| 💰 **Crypto Prices** | Live Bitcoin & Ethereum prices from CoinGecko |
| 😄 **Joke Generator** | Random programming jokes |
| 🌍 **IP Location** | Get location info from IP address |
| 🎨 **AI Image Gen** | Generate AI art with Stable Diffusion (free) |
| 📰 **Security News** | Latest cybersecurity news from RSS feeds |

**To use:** Click **Templates** in the left sidebar → Select a demo → Click **Create Workflow**

### 👥 Team Workspaces (Optional)

OrdoVertex supports team collaboration through Workspaces:

1. **Create a Workspace**: Click your email → "Workspaces" → "Create Workspace"
2. **Invite Team Members**: Add users by email with roles (Owner, Admin, Editor, Viewer)
3. **Share Workflows**: Move workflows to the workspace for team access
4. **Share Credentials**: Securely share API keys and connections

**Workspace Roles:**
- **Owner** - Full control, can delete workspace
- **Admin** - Manage members and settings
- **Editor** - Create/edit workflows and credentials
- **Viewer** - View-only access

### Custom Credentials (Optional)

To set your own admin credentials instead of defaults:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword docker-compose up -d
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

---

### Manual Setup (Without Docker)

For development or custom setups:

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

### Production Deployment

For production deployment with HTTPS, see the **[Deployment Guide](DEPLOYMENT.md)**.

## 📦 Available Nodes

### Triggers (5)
| Node | Description |
|------|-------------|
| Manual Trigger | Start workflows manually |
| Webhook | HTTP-based triggers with custom paths |
| Schedule Trigger | Cron-based scheduling |
| File Watch | Monitor file system changes |
| S3 Trigger | React to S3 bucket events |

### Actions (26)
| Category | Nodes |
|----------|-------|
| **Core** | HTTP Request, Code, Set, IF, Wait, Split, Aggregate |
| **Data** | CSV, Filter, Sort, Remove Duplicates, Date/Time, Math, Text Parser, Image Display |
| **Database** | SQL Database (PostgreSQL, MySQL, MSSQL, SQLite) |
| **Integration** | Send Email, SFTP, LDAP |
| **AI** | AI Agent, AI Embedding, AI Vector Store, Text Splitter |

### 🤖 AI Workflow Features
- **Multi-Provider Support**: OpenAI, Anthropic Claude, Google Gemini, Moonshot Kimi, Ollama
- **Memory Management**: Persistent conversation context
- **RAG Support**: Document indexing and vector search
- **Tool Integration**: Allow AI to call external APIs
- **Custom Prompts**: Full control over system prompts

See [AI Workflow Guide](AI_WORKFLOW_GUIDE.md) for detailed documentation.

## 🔐 Security Features

- ✅ **SAML 2.0 SSO** - Enterprise single sign-on (Okta, Azure AD, etc.)
- ✅ **MFA/TOTP** - Time-based one-time passwords
- ✅ **RBAC** - Role-based access control (Admin, User)
- ✅ **API Keys** - Secure programmatic access
- ✅ **Credential Encryption** - AES-256-GCM for sensitive data
- ✅ **Audit Logging** - Full execution history with input/output data
- ✅ **Security Headers** - CSP, HSTS, X-Frame-Options via Helmet.js
- ✅ **SSRF Protection** - Internal IPs and cloud metadata blocked
- ✅ **SQL Injection Prevention** - Parameterized queries only
- ✅ **Code Sandboxing** - Isolated JavaScript/Python execution
- ✅ **Admin Controls** - Optional approval required for code nodes

### Security Documentation

| Document | Description |
|----------|-------------|
| [Security Policy](SECURITY.md) | Current security posture and measures |
| [Security Audit](SECURITY_AUDIT.md) | Detailed security assessment |
| [Penetration Testing Guide](SECURITY.md#penetration-testing-guide) | Security testing commands |

## 📚 API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

### Workflows
```http
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PATCH  /api/workflows/:id
DELETE /api/workflows/:id
POST   /api/workflows/:id/execute
GET    /api/workflows/:id/export
POST   /api/workflows/import
```

### Templates
```http
GET  /api/templates
GET  /api/templates/:id
POST /api/templates/:id/create
```

### System (Admin)
```http
GET    /api/system/stats
GET    /api/system/maintenance
PATCH  /api/system/maintenance
POST   /api/system/maintenance/purge
GET    /api/system/maintenance/purge-preview
GET    /api/system/security          # Get security settings
PATCH  /api/system/security          # Update security settings
```

### Admin Workflows
```http
GET    /api/admin/workflows          # List all workflows
POST   /api/admin/workflows/:id/move # Move between workspaces
PATCH  /api/admin/workflows/:id/toggle # Enable/disable
GET    /api/admin/system-stats       # System statistics
```

### App Logs
```http
GET /api/logs/files                  # List log files
GET /api/logs/files/:filename        # View log content
```

### Webhooks
```http
POST /webhook/:workflowId/:path?
```

## ⚙️ Environment Variables

### Required (Production)
| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT signing | `min-32-char-random-string` |
| `ENCRYPTION_KEY` | Key for credential encryption | `min-32-char-random-string` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Security & Features
| Variable | Description | Default |
|----------|-------------|---------|
| `CODE_NODE_REQUIRE_ADMIN` | Require admin approval for code nodes | `false` |
| `CODE_EXEC_TIMEOUT` | Code execution timeout (ms) | `30000` |
| `JWT_EXPIRES_IN` | JWT token lifetime | `24h` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `*` (dev) / none (prod) |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3001` |
| `ALLOWED_WATCH_DIRECTORIES` | Allowed directories for File Watch | `/data` |

## 🛠️ Development

### Project Structure
```
ordovertex/
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── nodes/              # Node implementations (33 nodes)
│   │   │   ├── triggers/       # Trigger nodes (webhook, schedule, etc.)
│   │   │   ├── actions/        # Action nodes (HTTP, Code, Email, etc.)
│   │   │   └── ai/             # AI nodes (AI Agent, Embeddings, etc.)
│   │   ├── routes/             # API routes
│   │   ├── engine/             # Workflow execution engine
│   │   ├── utils/              # Security, encryption, sandboxing
│   │   └── services/           # External service integrations
│   └── prisma/                 # Database schema
├── frontend/                   # React SPA
│   └── src/
│       ├── components/         # React components
│       │   └── nodes/          # Node UI components
│       ├── store/              # Zustand state management
│       └── services/           # API service layer
├── SECURITY.md                 # Security documentation
├── SECURITY_AUDIT.md           # Security audit report
└── docker-compose.yml
```

### Adding New Nodes

1. Create a new file in `backend/src/nodes/` (triggers, actions, or ai)
2. Define the node using the `NodeType` interface
3. Register it in `backend/src/nodes/index.ts`

```typescript
export const myNode: NodeType = {
  name: 'myNode',
  displayName: 'My Node',
  category: 'Actions',
  // ... other properties
  execute: async (context) => {
    // Your logic here
    return { success: true, output: [] };
  }
};
```

## 🛠️ System Administration

### System Settings (Admin Only)

Administrators can configure platform-wide settings:

| Section | Settings |
|---------|----------|
| **General** | Site name, theme, registration, default role |
| **Security** | Code node approval, session timeout, login attempts, email verification |
| **Maintenance** | Log retention, auto-purge schedule, manual purge |
| **System Status** | Database stats, table sizes, counts |

### Security Settings

**Require Admin Approval for Code Nodes**
- When enabled, only administrators can create or modify workflows containing Code nodes
- Prevents unauthorized code execution
- Toggle in: System Settings → Security

### Database Maintenance

Configure automatic cleanup of old logs:
- Execution logs retention (default: 30 days)
- Workflow executions retention (default: 90 days)
- API request logs retention (default: 7 days)
- Auto-purge schedule (default: Daily at 2 AM)

## 🧪 Testing

```bash
# Backend unit tests (139 tests, ~3s)
cd backend
npm test

# Backend integration tests (60 tests, ~5s, requires running DB)
cd backend
npm run test:integration

# Frontend tests (11 tests, ~0.5s)
cd frontend
npm test
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [AI Workflow Guide](AI_WORKFLOW_GUIDE.md) | Building AI-powered workflows |
| [Node Development Guide](NODE_DEVELOPMENT_GUIDE.md) | Create custom nodes |
| [API Documentation](API.md) | Full REST API reference |
| [Deployment Guide](DEPLOYMENT.md) | Production deployment instructions |
| [Security Policy](SECURITY.md) | Current security posture and measures |
| [Security Audit](SECURITY_AUDIT.md) | Detailed security assessment and fixes |
| [Route Coverage](ROUTE_COVERAGE.md) | API to GUI coverage report |
| [Test Scheme](TEST_SCHEME.md) | Testing architecture and plan |
| [CHANGELOG](CHANGELOG.md) | Version history and changes |

## 📄 License

[MIT License](LICENSE) © 2026 OrdoVertex Contributors

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) - Inspiration for the workflow automation concept
- [React Flow](https://reactflow.dev/) - Visual workflow editor
- [BullMQ](https://bullmq.io/) - Job queue processing
- [Prisma](https://prisma.io/) - Database ORM

