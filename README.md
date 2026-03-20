# OrdoVertex 🔥

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **The center of order** - An open-source workflow automation platform. A powerful n8n alternative without limitations.

## 🌟 Features

- **Visual Workflow Editor**: Drag-and-drop interface built with React Flow
- **30+ Built-in Nodes**: HTTP, Code, SQL, Email, CSV, AI Agents, LDAP, and more
- **AI-Powered Workflows**: Multi-provider LLM support (OpenAI, Anthropic, Gemini, Kimi, Ollama)
- **Multiple Trigger Types**: Webhook, Schedule (Cron), Manual, File Watch
- **Enterprise Security**: SAML SSO, MFA/TOTP, Role-based access control
- **Execution Monitoring**: Full logging, alerting, and audit trails
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

**Transform** - Data manipulation and processing nodes:

![Transform](.screenshots/transform.png)

**AI** - AI-powered nodes for intelligent automation:

![AI Nodes](.screenshots/ai.png)

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Server    │────▶│   PostgreSQL    │
│   (React)       │     │   (Express)     │     │   (Database)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │      Redis      │
                        │   (Queue/Cache) │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Worker Process │
                        │  (BullMQ)       │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for local development)

### Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/cms000123456/OrdoVertex.git
cd ordovertex

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001

# Create initial admin user (optional - first user becomes admin)
# Set environment variables before starting:
# Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before starting
```

### Manual Setup

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

For production deployment with HTTPS, environment configuration, and security hardening, see the **[Deployment Guide](DEPLOYMENT.md)**.

## 📦 Available Nodes

### Triggers (5)
| Node | Description |
|------|-------------|
| Manual Trigger | Start workflows manually |
| Webhook | HTTP-based triggers with custom paths |
| Schedule Trigger | Cron-based scheduling |
| File Watch | Monitor file system changes |
| S3 Trigger | React to S3 bucket events |

### Actions (24)
| Category | Nodes |
|----------|-------|
| **Core** | HTTP Request, Code, Set, IF, Wait, Split, Aggregate |
| **Data** | CSV, Filter, Sort, Remove Duplicates, Date/Time, Math |
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
- ✅ **Audit Logging** - Full execution history
- ✅ **SSRF Protection** - Blocked internal IP ranges
- ✅ **SQL Injection Prevention** - Parameterized queries only

See [Security Audit Report](SECURITY_AUDIT.md) for details.

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

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `*` (dev) / none (prod) |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3001` |

## 🛠️ Development

### Project Structure
```
ordovertex/
├── backend/           # Express.js API
│   ├── src/
│   │   ├── nodes/     # Node implementations
│   │   ├── routes/    # API routes
│   │   ├── engine/    # Workflow execution engine
│   │   └── utils/     # Utilities
│   └── prisma/        # Database schema
├── frontend/          # React SPA
│   └── src/
│       ├── components/
│       └── store/     # State management
└── docker-compose.yml
```

### Adding New Nodes

1. Create a new file in `backend/src/nodes/` (core or actions)
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

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📖 Documentation

- [AI Workflow Guide](AI_WORKFLOW_GUIDE.md) - Building AI-powered workflows
- [Security Audit](SECURITY_AUDIT.md) - Security assessment and fixes
- [API Documentation](API.md) - Full API reference

## 📄 License

[MIT License](LICENSE) © 2026 OrdoVertex Contributors

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) - Inspiration for the workflow automation concept
- [React Flow](https://reactflow.dev/) - Visual workflow editor
- [BullMQ](https://bullmq.io/) - Job queue processing
- [Prisma](https://prisma.io/) - Database ORM

