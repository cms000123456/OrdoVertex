import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import cron from 'node-cron';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { sendTestEmail, verifyEmailConfig, clearEmailTransporter } from '../services/email';
import { encrypt, decrypt, EncryptedData } from '../utils/encryption';
import { rateLimit } from '../utils/rate-limit';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Default maintenance settings
const DEFAULT_MAINTENANCE_SETTINGS = {
  executionLogsRetention: 30, // days
  workflowExecutionsRetention: 90, // days
  apiRequestLogsRetention: 7, // days
  enableAutoPurge: true,
  purgeSchedule: '0 2 * * *', // Daily at 2 AM
  lastPurgeRun: null as string | null,
  nextPurgeRun: null as string | null
};

// Default security settings
const DEFAULT_SECURITY_SETTINGS = {
  requireCodeNodeApproval: false,  // Require admin approval for code nodes
  sessionTimeout: 60,              // minutes
  maxLoginAttempts: 5,
  requireEmailVerification: false
};

// Default email settings
const DEFAULT_EMAIL_SETTINGS = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpSecure: false,  // true for 465, false for other ports
  fromEmail: '',
  fromName: 'OrdoVertex',
  enabled: false
};

// Default general settings
const DEFAULT_GENERAL_SETTINGS = {
  siteName: 'OrdoVertex',
  baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',  // Used for email links
  allowRegistration: true,
  defaultUserRole: 'user'
};

let maintenanceSettings = { ...DEFAULT_MAINTENANCE_SETTINGS };
let securitySettings = { ...DEFAULT_SECURITY_SETTINGS };
let emailSettings = { ...DEFAULT_EMAIL_SETTINGS };
let generalSettings = { ...DEFAULT_GENERAL_SETTINGS };
let scheduledPurgeTask: cron.ScheduledTask | null = null;
let emailPasswordCiphertext: EncryptedData | null = null;

// Export function to check if code nodes require admin approval
export function isCodeNodeApprovalRequired(): boolean {
  return securitySettings.requireCodeNodeApproval;
}

// Export function to get base URL for email links
export function getBaseUrl(): string {
  return generalSettings.baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
}

// Export function to get security settings
export function getSecuritySettings() {
  return { ...securitySettings };
}

// Middleware to check admin
function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
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
    logger.error('Get system stats error:', error);
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
    logger.error('Get maintenance settings error:', error);
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
    logger.error('Update maintenance settings error:', error);
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
    logger.error('Manual purge error:', error);
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
    logger.error('Get purge preview error:', error);
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
    logger.error('[Maintenance] Invalid cron expression:', maintenanceSettings.purgeSchedule);
    return;
  }
  
  // Schedule new task
  scheduledPurgeTask = cron.schedule(
    maintenanceSettings.purgeSchedule,
    async () => {
      logger.info('[Maintenance] Running scheduled purge...');
      const results = await runPurge();
      logger.info('[Maintenance] Purge completed:', results);
    },
    { scheduled: true }
  );

  maintenanceSettings.nextPurgeRun = calculateNextRun(maintenanceSettings.purgeSchedule);
  logger.info('[Maintenance] Auto-purge scheduled:', maintenanceSettings.purgeSchedule);
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

// ========================================================================
// Security Settings Routes
// ========================================================================

// Get security settings
router.get('/security', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: securitySettings
    });
  } catch (error: any) {
    logger.error('Get security settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update security settings
router.patch('/security', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      requireCodeNodeApproval,
      sessionTimeout,
      maxLoginAttempts,
      requireEmailVerification
    } = req.body;

    if (requireCodeNodeApproval !== undefined) {
      if (typeof requireCodeNodeApproval !== 'boolean') {
        return errorResponse(res, 'requireCodeNodeApproval must be a boolean', 400);
      }
      securitySettings.requireCodeNodeApproval = requireCodeNodeApproval;
      logger.info(`[Security] Code node approval requirement set to: ${securitySettings.requireCodeNodeApproval}`);
    }

    if (sessionTimeout !== undefined) {
      const timeout = parseInt(sessionTimeout, 10);
      if (isNaN(timeout) || timeout < 5 || timeout > 480) {
        return errorResponse(res, 'Session timeout must be a number between 5 and 480 minutes', 400);
      }
      securitySettings.sessionTimeout = timeout;
    }

    if (maxLoginAttempts !== undefined) {
      const attempts = parseInt(maxLoginAttempts, 10);
      if (isNaN(attempts) || attempts < 3 || attempts > 10) {
        return errorResponse(res, 'Max login attempts must be a number between 3 and 10', 400);
      }
      securitySettings.maxLoginAttempts = attempts;
    }

    if (requireEmailVerification !== undefined) {
      if (typeof requireEmailVerification !== 'boolean') {
        return errorResponse(res, 'requireEmailVerification must be a boolean', 400);
      }
      securitySettings.requireEmailVerification = requireEmailVerification;
    }

    res.json({
      success: true,
      data: securitySettings
    });
  } catch (error: any) {
    logger.error('Update security settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// Email Settings Routes
// ========================================================================

// Get email settings
router.get('/email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Don't return the actual password, just mask it
    const safeSettings = {
      ...emailSettings,
      smtpPassword: emailPasswordCiphertext ? '********' : ''
    };
    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error: any) {
    logger.error('Get email settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update email settings
router.patch('/email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure,
      fromEmail,
      fromName,
      enabled
    } = req.body;

    if (smtpHost !== undefined) {
      emailSettings.smtpHost = smtpHost;
    }

    if (smtpPort !== undefined) {
      const port = parseInt(smtpPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return errorResponse(res, 'Invalid SMTP port', 400);
      }
      emailSettings.smtpPort = port;
    }

    if (smtpUser !== undefined) {
      emailSettings.smtpUser = smtpUser;
    }

    if (smtpPassword !== undefined) {
      if (smtpPassword === '') {
        emailPasswordCiphertext = null;
      } else {
        emailPasswordCiphertext = encrypt(smtpPassword);
      }
    }

    if (smtpSecure !== undefined) {
      emailSettings.smtpSecure = Boolean(smtpSecure);
    }

    if (fromEmail !== undefined) {
      emailSettings.fromEmail = fromEmail;
    }

    if (fromName !== undefined) {
      emailSettings.fromName = fromName;
    }

    if (enabled !== undefined) {
      emailSettings.enabled = Boolean(enabled);
    }

    logger.info(`[Email] Settings updated. Enabled: ${emailSettings.enabled}, Host: ${emailSettings.smtpHost}`);

    // Clear transporter cache so new settings take effect
    clearEmailTransporter();

    // Return safe settings (masked password)
    const safeSettings = {
      ...emailSettings,
      smtpPassword: emailPasswordCiphertext ? '********' : ''
    };

    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error: any) {
    logger.error('Update email settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test email configuration
router.post('/email/test', authMiddleware, adminMiddleware, rateLimit({ windowMs: 60_000, max: 10, message: 'Too many test email requests, please try again later.' }), async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!emailSettings.enabled) {
      return errorResponse(res, 'Email is not enabled. Please configure and enable email settings first.', 400);
    }

    if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailPasswordCiphertext) {
      return errorResponse(res, 'Email settings are incomplete. Please configure SMTP host, user, and password.', 400);
    }

    // First verify the configuration
    const verifyResult = await verifyEmailConfig();
    if (!verifyResult.valid) {
      return errorResponse(res, `Email configuration error: ${verifyResult.error}`, 400);
    }

    // Send actual test email
    const result = await sendTestEmail(testEmail);
    
    if (!result.success) {
      return errorResponse(res, `Failed to send test email: ${result.error}`, 500);
    }

    res.json({
      success: true,
      data: {
        message: 'Test email sent successfully',
        messageId: result.messageId,
        recipient: testEmail,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Test email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export function to get email settings for use in other modules
export function getEmailSettings() {
  return {
    ...emailSettings,
    smtpPassword: emailPasswordCiphertext
      ? decrypt(emailPasswordCiphertext.encrypted, emailPasswordCiphertext.iv)
      : ''
  };
}

// ========================================================================
// General Settings Routes
// ========================================================================

// Get general settings
router.get('/general', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: generalSettings
    });
  } catch (error: any) {
    logger.error('Get general settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update general settings
router.patch('/general', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      siteName,
      baseUrl,
      allowRegistration,
      defaultUserRole
    } = req.body;

    if (siteName !== undefined) {
      generalSettings.siteName = siteName;
    }

    if (baseUrl !== undefined) {
      // Validate URL format
      try {
        new URL(baseUrl);
        generalSettings.baseUrl = baseUrl;
      } catch {
        return errorResponse(res, 'Invalid base URL format. Must be a valid URL like https://example.com', 400);
      }
    }

    if (allowRegistration !== undefined) {
      generalSettings.allowRegistration = Boolean(allowRegistration);
    }

    if (defaultUserRole !== undefined) {
      if (!['user', 'admin'].includes(defaultUserRole)) {
        return errorResponse(res, 'Default user role must be "user" or "admin"', 400);
      }
      generalSettings.defaultUserRole = defaultUserRole;
    }

    logger.info(`[General] Settings updated. Base URL: ${generalSettings.baseUrl}`);

    res.json({
      success: true,
      data: generalSettings
    });
  } catch (error: any) {
    logger.error('Update general settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;