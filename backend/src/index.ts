import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateEnvOrExit } from './utils/env-validation';
import { prisma } from './prisma';

// Validate environment before anything else
validateEnvOrExit();

import { Server } from 'http';
import { registerAllNodes } from './nodes';
import { scheduler } from './engine/scheduler';
import { rateLimit } from './utils/rate-limit';
import logger, { logStream } from './utils/logger';

import { errorSanitizerMiddleware, sanitizedErrorHandler } from './utils/security';

import authRoutes from './routes/auth';
import authExtendedRoutes from './routes/auth-extended';
import workflowRoutes from './routes/workflows';
import nodeRoutes from './routes/nodes';
import webhookRoutes from './routes/webhooks';
import executionRoutes from './routes/executions';
import userRoutes from './routes/users';
import credentialRoutes from './routes/credentials';
import apiKeyRoutes from './routes/api-keys';
import workspaceRoutes from './routes/workspaces';
import groupRoutes from './routes/groups';
import executionLogRoutes from './routes/execution-logs';
import alertRoutes from './routes/alerts';
import templateRoutes from './routes/templates';
import logsRoutes from './routes/logs';
import systemRoutes from './routes/system';
import schedulerRoutes from './routes/scheduler';
import queueRoutes from './routes/queue';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy when behind nginx (needed for accurate req.ip in rate limiting)
app.set('trust proxy', 1);

// Middleware
// Configure CORS - in production, restrict to specific origins
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 
          process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
app.use(cors(corsOptions));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for some frontend functionality
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true, // Prevent MIME sniffing
  xFrameOptions: { action: 'deny' }, // Clickjacking protection
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize error messages in production
app.use(errorSanitizerMiddleware);

// Apply rate limiting to all API routes
app.use('/api/', rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120 // 120 requests per minute
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authExtendedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/execution-logs', executionLogRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/webhook', webhookRoutes);

// Error handling with sanitization for production
app.use(sanitizedErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Not found'
    }
  });
});

// Initialize and start server
let server: Server;

async function main() {
  try {
    // Register all nodes
    registerAllNodes();

    // Initialize scheduler
    await scheduler.initialize();

    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`
🚀 OrdoVertex API Server running on port ${PORT}

API Endpoints:
- Health:     http://localhost:${PORT}/health
- Auth:       http://localhost:${PORT}/api/auth
- Users:      http://localhost:${PORT}/api/users
- Workflows:  http://localhost:${PORT}/api/workflows
- Nodes:      http://localhost:${PORT}/api/nodes
- Executions: http://localhost:${PORT}/api/executions
- Credentials:http://localhost:${PORT}/api/credentials
- Webhooks:   http://localhost:${PORT}/webhook/:workflowId/:path?
      `);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  if (server) {
    server.close(() => logger.info('HTTP server closed'));
  }
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main();
