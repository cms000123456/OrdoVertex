import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();
const prisma = new PrismaClient();

// Default maintenance settings
const DEFAULT_MAINTENANCE_SETTINGS = {
  executionLogsRetention: 30, // days
  workflowExecutionsRetention: 90, // days
  apiRequestLogsRetention: 7, // days
  enableAutoPurge: true,
  purgeSchedule: '0 2 * * *', // Daily at 2 AM
  lastPurgeRun: null,
  nextPurgeRun: null
};

let maintenanceSettings = { ...DEFAULT_MAINTENANCE_SETTINGS };
let scheduledPurgeTask: cron.ScheduledTask | null = null;

// Middleware to check admin
function adminMiddleware(req: AuthRequest, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return errorResponse(res, 'Admin access required', 403);
  }
  next();
}

// Get system stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      workflowCount,
      executionCount,
      userCount,
      executionLogCount,
      nodeExecutionCount
    ] = await Promise.all([
      prisma.workflow.count(),
      prisma.workflowExecution.count(),
      prisma.user.count(),
      prisma.executionLog.count(),
      prisma.nodeExecution.count()
    ]);

    // Get database size (PostgreSQL specific)
    const dbSize = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;

    // Get table sizes
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    res.json({
      success: true,
      data: {
        counts: {
          workflows: workflowCount,
          executions: executionCount,
          users: userCount,
          executionLogs: executionLogCount,
          nodeExecutions: nodeExecutionCount
        },
        database: {
          size: (dbSize as any)[0]?.size || 'Unknown',
          tables: tableSizes
        }
      }
    });
  } catch (error: any) {
    console.error('Get system stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get maintenance settings
router.get('/maintenance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: maintenanceSettings
    });
  } catch (error: any) {
    console.error('Get maintenance settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update maintenance settings
router.patch('/maintenance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      executionLogsRetention,
      workflowExecutionsRetention,
      apiRequestLogsRetention,
      enableAutoPurge,
      purgeSchedule
    } = req.body;

    // Validate settings
    if (executionLogsRetention !== undefined) {
      if (executionLogsRetention < 1 || executionLogsRetention > 365) {
        return errorResponse(res, 'Execution logs retention must be between 1 and 365 days', 400);
      }
      maintenanceSettings.executionLogsRetention = executionLogsRetention;
    }

    if (workflowExecutionsRetention !== undefined) {
      if (workflowExecutionsRetention < 1 || workflowExecutionsRetention > 365) {
        return errorResponse(res, 'Workflow executions retention must be between 1 and 365 days', 400);
      }
      maintenanceSettings.workflowExecutionsRetention = workflowExecutionsRetention;
    }

    if (apiRequestLogsRetention !== undefined) {
      if (apiRequestLogsRetention < 1 || apiRequestLogsRetention > 365) {
        return errorResponse(res, 'API request logs retention must be between 1 and 365 days', 400);
      }
      maintenanceSettings.apiRequestLogsRetention = apiRequestLogsRetention;
    }

    if (enableAutoPurge !== undefined) {
      maintenanceSettings.enableAutoPurge = enableAutoPurge;
      
      // Schedule or unschedule purge
      if (enableAutoPurge) {
        scheduleAutoPurge();
      } else {
        if (scheduledPurgeTask) {
          scheduledPurgeTask.stop();
          scheduledPurgeTask = null;
        }
        maintenanceSettings.nextPurgeRun = null;
      }
    }

    if (purgeSchedule) {
      // Validate cron expression (basic check)
      if (!isValidCron(purgeSchedule)) {
        return errorResponse(res, 'Invalid cron schedule format', 400);
      }
      maintenanceSettings.purgeSchedule = purgeSchedule;
      
      // Reschedule if auto-purge is enabled
      if (maintenanceSettings.enableAutoPurge) {
        scheduleAutoPurge();
      }
    }

    res.json({
      success: true,
      data: maintenanceSettings
    });
  } catch (error: any) {
    console.error('Update maintenance settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual purge
router.post('/maintenance/purge', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const results = await runPurge();
    
    res.json({
      success: true,
      data: {
        message: 'Purge completed successfully',
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Manual purge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get purge preview (what would be deleted)
router.get('/maintenance/purge-preview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    
    const [
      executionLogsToDelete,
      oldExecutions,
      oldNodeExecutions
    ] = await Promise.all([
      prisma.executionLog.count({
        where: {
          timestamp: {
            lt: new Date(now.getTime() - maintenanceSettings.executionLogsRetention * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.workflowExecution.count({
        where: {
          startedAt: {
            lt: new Date(now.getTime() - maintenanceSettings.workflowExecutionsRetention * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.nodeExecution.count({
        where: {
          startedAt: {
            lt: new Date(now.getTime() - maintenanceSettings.workflowExecutionsRetention * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        executionLogs: executionLogsToDelete,
        workflowExecutions: oldExecutions,
        nodeExecutions: oldNodeExecutions,
        total: executionLogsToDelete + oldExecutions + oldNodeExecutions
      }
    });
  } catch (error: any) {
    console.error('Get purge preview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run the purge operation
async function runPurge() {
  const now = new Date();
  const results = {
    executionLogs: 0,
    workflowExecutions: 0,
    nodeExecutions: 0,
    errors: [] as string[]
  };

  try {
    // Delete old execution logs
    const executionLogsResult = await prisma.executionLog.deleteMany({
      where: {
        timestamp: {
          lt: new Date(now.getTime() - maintenanceSettings.executionLogsRetention * 24 * 60 * 60 * 1000)
        }
      }
    });
    results.executionLogs = executionLogsResult.count;
  } catch (err: any) {
    results.errors.push(`Execution logs purge failed: ${err.message}`);
  }

  try {
    // Delete old node executions
    const nodeExecutionResult = await prisma.nodeExecution.deleteMany({
      where: {
        startedAt: {
          lt: new Date(now.getTime() - maintenanceSettings.workflowExecutionsRetention * 24 * 60 * 60 * 1000)
        }
      }
    });
    results.nodeExecutions = nodeExecutionResult.count;
  } catch (err: any) {
    results.errors.push(`Node executions purge failed: ${err.message}`);
  }

  try {
    // Delete old workflow executions (and their associated data via cascade)
    const executionResult = await prisma.workflowExecution.deleteMany({
      where: {
        startedAt: {
          lt: new Date(now.getTime() - maintenanceSettings.workflowExecutionsRetention * 24 * 60 * 60 * 1000)
        }
      }
    });
    results.workflowExecutions = executionResult.count;
  } catch (err: any) {
    results.errors.push(`Workflow executions purge failed: ${err.message}`);
  }

  // Update last purge time
  maintenanceSettings.lastPurgeRun = now.toISOString();
  
  // Calculate next purge time
  if (maintenanceSettings.enableAutoPurge) {
    maintenanceSettings.nextPurgeRun = calculateNextRun(maintenanceSettings.purgeSchedule);
  }

  return results;
}

// Schedule auto-purge
function scheduleAutoPurge() {
  // Stop existing task if any
  if (scheduledPurgeTask) {
    scheduledPurgeTask.stop();
    scheduledPurgeTask = null;
  }
  
  // Validate cron expression
  if (!cron.validate(maintenanceSettings.purgeSchedule)) {
    console.error('[Maintenance] Invalid cron expression:', maintenanceSettings.purgeSchedule);
    return;
  }
  
  // Schedule new task
  scheduledPurgeTask = cron.schedule(
    maintenanceSettings.purgeSchedule,
    async () => {
      console.log('[Maintenance] Running scheduled purge...');
      const results = await runPurge();
      console.log('[Maintenance] Purge completed:', results);
    },
    { scheduled: true }
  );

  maintenanceSettings.nextPurgeRun = calculateNextRun(maintenanceSettings.purgeSchedule);
  console.log('[Maintenance] Auto-purge scheduled:', maintenanceSettings.purgeSchedule);
}

// Calculate next run time from cron
function calculateNextRun(cron: string): string {
  // This is a simplified calculation - in production use a proper cron parser
  const now = new Date();
  // For daily at 2 AM, next run is tomorrow at 2 AM
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(2, 0, 0, 0);
  return next.toISOString();
}

// Basic cron validation
function isValidCron(cron: string): boolean {
  const parts = cron.split(' ');
  return parts.length === 5;
}

// Initialize auto-purge on startup
if (maintenanceSettings.enableAutoPurge) {
  scheduleAutoPurge();
}

export default router;
