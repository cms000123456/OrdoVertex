import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import { registerAllNodes } from './nodes';
import { scheduler } from './engine/scheduler';
import { rateLimit } from './utils/rate-limit';

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

const app = express();
const prisma = new PrismaClient();
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api/', rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120 // 120 requests per minute
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
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
app.use('/webhook', webhookRoutes);

// Admin/System Routes
app.get('/api/admin/system-stats', async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('System stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error'
    }
  });
});

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
    console.log('✅ Database connected');

    // Start server
    app.listen(PORT, () => {
      console.log(`
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
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await scheduler.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

main();
