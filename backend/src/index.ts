import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateEnvOrExit } from './utils/env-validation';
import { prisma } from './prisma';

// Validate environment before anything else
validateEnvOrExit();

import { registerAllNodes } from './nodes';
import { scheduler } from './engine/scheduler';
import { rateLimit } from './utils/rate-limit';
import logger, { logStream } from './utils/logger';
import { getErrorMessage } from './utils/error-helper';
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

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use('/webhook', webhookRoutes);

// Admin/System Routes
import { authMiddleware } from './utils/auth';
const authenticateToken = authMiddleware;

// Get all workflows (admin only)
app.get('/api/admin/workflows', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const workflows = await prisma.workflow.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        userId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, name: true }
        },
        workspace: {
          select: { id: true, name: true }
        },
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ success: true, data: workflows });
  } catch (error: unknown) {
    logger.error('Admin workflows error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// Delete any workflow (admin only)
app.delete('/api/admin/workflows/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    await prisma.workflow.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (error: unknown) {
    logger.error('Admin delete workflow error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// Move workflow to different workspace (admin only)
app.post('/api/admin/workflows/:id/move', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { workspaceId } = req.body;
    
    // If workspaceId is provided, verify workspace exists
    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId }
      });
      if (!workspace) {
        return res.status(404).json({ success: false, error: 'Workspace not found' });
      }
    }
    
    const updated = await prisma.workflow.update({
      where: { id },
      data: { workspaceId: workspaceId || null },
      select: {
        id: true,
        name: true,
        active: true,
        userId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, name: true }
        },
        workspace: {
          select: { id: true, name: true }
        },
        _count: {
          select: { executions: true }
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: workspaceId ? 'Workflow moved to workspace' : 'Workflow moved to personal',
      data: updated 
    });
  } catch (error: unknown) {
    logger.error('Admin move workflow error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// Toggle workflow active state (admin only)
app.patch('/api/admin/workflows/:id/toggle', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { active: true }
    });
    
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    const updated = await prisma.workflow.update({
      where: { id },
      data: { active: !workflow.active },
      select: {
        id: true,
        name: true,
        active: true,
        userId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, name: true }
        },
        workspace: {
          select: { id: true, name: true }
        },
        _count: {
          select: { executions: true }
        }
      }
    });
    
    res.json({ success: true, data: updated });
  } catch (error: unknown) {
    logger.error('Admin toggle workflow error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

app.get('/api/admin/system-stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    const os = await import('os');
    
    // Get memory stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Get disk stats (simplified - uses root partition info)
    let diskStats = { total: 0, used: 0, free: 0 };
    try {
      const { execSync } = await import('child_process');
      const dfOutput = execSync('df -k / 2>/dev/null || df -k .', { encoding: 'utf8' });
      const lines = dfOutput.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 4) {
          diskStats.total = parseInt(parts[1]) * 1024;
          diskStats.used = parseInt(parts[2]) * 1024;
          diskStats.free = parseInt(parts[3]) * 1024;
        }
      }
    } catch {
      // Fallback if df command fails
      diskStats = { total: totalMem * 2, used: usedMem, free: totalMem * 2 - usedMem };
    }
    
    const stats = {
      cpu: {
        usage: os.loadavg()[0] * 10, // Rough estimate based on load average
        cores: os.cpus().length,
        loadAvg: os.loadavg()
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100
      },
      disk: {
        total: diskStats.total || totalMem * 2,
        used: diskStats.used || usedMem,
        free: diskStats.free || (totalMem * 2 - usedMem),
        percentage: diskStats.total ? (diskStats.used / diskStats.total) * 100 : 25
      },
      uptime: os.uptime(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    
    res.json({ success: true, data: stats });
  } catch (error: unknown) {
    logger.error('System stats error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

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
    app.listen(PORT, () => {
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
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

main();
