import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { executeWorkflow } from '../engine/executor';
import { queueWorkflowExecution, sendSchedulerControl } from '../engine/queue';
import { workflowContainsCodeNodes } from '../utils/code-sandbox';
import { isCodeNodeApprovalRequired } from './system';

const router = Router();
const prisma = new PrismaClient();

// Helper to verify user exists (handles case where DB was reset but token is still valid)
async function verifyUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  return user !== null;
}

// All routes require authentication
router.use(authMiddleware);

// Get all workflows
router.get('/', async (req: AuthRequest, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        userId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return successResponse(res, workflows);
  } catch (error: any) {
    console.error('Get workflows error:', error);
    return errorResponse(res, 'Failed to get workflows', 500);
  }
});

// Get single workflow
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            mode: true
          }
        },
        triggers: true
      }
    });

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    return successResponse(res, workflow);
  } catch (error: any) {
    console.error('Get workflow error:', error);
    return errorResponse(res, 'Failed to get workflow', 500);
  }
});

// Create workflow
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('nodes').isArray(),
    body('connections').isArray()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { name, description, nodes, connections, settings } = req.body;

      // Verify user exists before creating workflow
      if (!(await verifyUserExists(req.user!.id))) {
        return errorResponse(res, 'User not found. Please log out and log in again.', 401);
      }

      // Security: Check for code nodes
      const hasCodeNodes = workflowContainsCodeNodes({ nodes });
      if (hasCodeNodes && isCodeNodeApprovalRequired()) {
        // Check if user is admin
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { role: true }
        });
        if (user?.role !== 'admin') {
          return errorResponse(
            res, 
            'Workflows containing Code nodes require admin approval. Contact your administrator.', 
            403
          );
        }
      }

      const workflow = await prisma.workflow.create({
        data: {
          name,
          description,
          nodes,
          connections,
          settings,
          userId: req.user!.id
        }
      });

      return successResponse(res, workflow, 201);
    } catch (error: any) {
      console.error('Create workflow error:', error);
      return errorResponse(res, 'Failed to create workflow', 500);
    }
  }
);

// Update workflow
router.patch(
  '/:id',
  [
    param('id').isUUID()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, nodes, connections, settings, active } = req.body;

      // Verify ownership
      const existing = await prisma.workflow.findFirst({
        where: { id, userId: req.user!.id }
      });

      if (!existing) {
        return errorResponse(res, 'Workflow not found', 404);
      }

      // Security: Check for code nodes on update
      if (nodes) {
        const hasCodeNodes = workflowContainsCodeNodes({ nodes });
        if (hasCodeNodes && isCodeNodeApprovalRequired()) {
          const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { role: true }
          });
          if (user?.role !== 'admin') {
            return errorResponse(
              res, 
              'Workflows containing Code nodes require admin approval. Contact your administrator.', 
              403
            );
          }
        }
      }

      const workflow = await prisma.workflow.update({
        where: { id },
        data: {
          name,
          description,
          nodes,
          connections,
          settings,
          active
        }
      });

      // Handle schedule triggers — upsert DB record and signal worker
      if (nodes) {
        const triggerNode = nodes.find((n: any) => n.type === 'scheduleTrigger');
        if (triggerNode) {
          const p = triggerNode.parameters || {};
          const buildCron = (): string => {
            if (p.scheduleMode === 'custom') {
              return p.cronExpression || '0 9 * * *';
            }
            const [h, m] = (p.atTime || '09:00').split(':').map(Number);
            const hh = isNaN(h) ? 9 : h;
            const mm = isNaN(m) ? 0 : m;
            switch (p.frequency) {
              case 'every_minute':    return '* * * * *';
              case 'every_n_minutes': return `*/${Math.max(1, parseInt(p.intervalMinutes) || 15)} * * * *`;
              case 'hourly':          return `${parseInt(p.atMinute) || 0} * * * *`;
              case 'weekly': {
                const days = Array.isArray(p.weekDays) && p.weekDays.length > 0 ? p.weekDays.join(',') : (p.weekDay ?? '1');
                return `${mm} ${hh} * * ${days}`;
              }
              case 'monthly': {
                const mdays = Array.isArray(p.monthDays) && p.monthDays.length > 0 ? p.monthDays.join(',') : (p.monthDay ?? '1');
                return `${mm} ${hh} ${mdays} * *`;
              }
              default:                return `${mm} ${hh} * * *`; // daily
            }
          };
          const config = {
            cron: buildCron(),
            timezone: (p.timezone || 'UTC').trim()
          };
          const triggerEnabled = triggerNode.parameters?.enabled !== false;
          const existingTrigger = await prisma.trigger.findFirst({
            where: { workflowId: id, type: 'schedule' }
          });
          if (existingTrigger) {
            await prisma.trigger.update({
              where: { id: existingTrigger.id },
              data: { enabled: triggerEnabled, config }
            });
          } else {
            await prisma.trigger.create({
              data: { workflowId: id, type: 'schedule', enabled: triggerEnabled, config }
            });
          }
          if (triggerEnabled) {
            await sendSchedulerControl('schedule', id, config);
          } else {
            await sendSchedulerControl('unschedule', id);
          }
        } else {
          // Schedule node was removed — clean up trigger record and stop job
          await prisma.trigger.deleteMany({
            where: { workflowId: id, type: 'schedule' }
          });
          await sendSchedulerControl('unschedule', id);
        }
      }

      return successResponse(res, workflow);
    } catch (error: any) {
      console.error('Update workflow error:', error);
      return errorResponse(res, 'Failed to update workflow', 500);
    }
  }
);

// Delete workflow
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.workflow.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!existing) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    // Unschedule if needed
    await sendSchedulerControl('unschedule', id);

    await prisma.workflow.delete({
      where: { id }
    });

    return successResponse(res, { deleted: true });
  } catch (error: any) {
    console.error('Delete workflow error:', error);
    return errorResponse(res, 'Failed to delete workflow', 500);
  }
});

// Execute workflow manually
router.post('/:id/execute', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = req.body.data || {};

    // Verify ownership
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    // Queue the execution
    const job = await queueWorkflowExecution(id, req.user!.id, data, 'manual');

    return successResponse(res, { 
      executionId: job.id,
      message: 'Workflow execution queued'
    }, 202);
  } catch (error: any) {
    console.error('Execute workflow error:', error);
    return errorResponse(res, 'Failed to execute workflow', 500);
  }
});

// Get workflow executions
router.get('/:id/executions', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify ownership
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.workflowExecution.count({
      where: { workflowId: id }
    });

    return successResponse(res, {
      executions,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error: any) {
    console.error('Get executions error:', error);
    return errorResponse(res, 'Failed to get executions', 500);
  }
});

// Get execution details
router.get('/:id/executions/:executionId', async (req: AuthRequest, res) => {
  try {
    const { id, executionId } = req.params;

    // Verify ownership
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    const execution = await prisma.workflowExecution.findFirst({
      where: { 
        id: executionId,
        workflowId: id
      },
      include: {
        nodeExecutions: true
      }
    });

    if (!execution) {
      return errorResponse(res, 'Execution not found', 404);
    }

    return successResponse(res, execution);
  } catch (error: any) {
    console.error('Get execution error:', error);
    return errorResponse(res, 'Failed to get execution', 500);
  }
});

// Export workflow as JSON
router.get('/:id/export', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    // Create export object with metadata
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: req.user!.email,
      workflow: {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings
      }
    };

    // Set headers for file download
    const filename = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.json(exportData);
  } catch (error: any) {
    console.error('Export workflow error:', error);
    return errorResponse(res, 'Failed to export workflow', 500);
  }
});

// Import workflow from JSON
router.post('/import', async (req: AuthRequest, res) => {
  try {
    const { workflow: workflowData, name: customName } = req.body;

    if (!workflowData || !workflowData.nodes) {
      return errorResponse(res, 'Invalid workflow data', 400);
    }

    // Validate required fields
    if (!Array.isArray(workflowData.nodes)) {
      return errorResponse(res, 'Invalid nodes format', 400);
    }

    // Verify user exists before importing workflow
    if (!(await verifyUserExists(req.user!.id))) {
      return errorResponse(res, 'User not found. Please log out and log in again.', 401);
    }

    // Create new workflow from imported data
    const workflow = await prisma.workflow.create({
      data: {
        name: customName || workflowData.name || 'Imported Workflow',
        description: workflowData.description || 'Imported from file',
        nodes: workflowData.nodes,
        connections: workflowData.connections || [],
        settings: workflowData.settings || {},
        userId: req.user!.id,
        active: false
      }
    });

    return successResponse(res, {
      message: 'Workflow imported successfully',
      workflow
    });
  } catch (error: any) {
    console.error('Import workflow error:', error);
    return errorResponse(res, 'Failed to import workflow', 500);
  }
});

// Import workflow from template JSON (duplicate endpoint for clarity)
router.post('/import/validate', async (req: AuthRequest, res) => {
  try {
    const { workflow: workflowData } = req.body;

    if (!workflowData || !workflowData.nodes) {
      return errorResponse(res, 'Invalid workflow data', 400);
    }

    // Return validation info without creating
    return successResponse(res, {
      valid: true,
      name: workflowData.name || 'Untitled',
      description: workflowData.description || '',
      nodeCount: workflowData.nodes?.length || 0,
      connectionCount: workflowData.connections?.length || 0
    });
  } catch (error: any) {
    console.error('Validate workflow error:', error);
    return errorResponse(res, 'Failed to validate workflow', 500);
  }
});

// Move workflow to a different workspace
router.post('/:id/move', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;

    // Verify workflow ownership
    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!workflow) {
      return errorResponse(res, 'Workflow not found', 404);
    }

    // If workspaceId is null, move to personal (no workspace)
    if (workspaceId === null || workspaceId === undefined) {
      const updated = await prisma.workflow.update({
        where: { id },
        data: { workspaceId: null }
      });
      return successResponse(res, { 
        message: 'Workflow moved to personal workflows',
        workflow: updated 
      });
    }

    // Verify user has access to the target workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: req.user!.id },
          { 
            members: { 
              some: { 
                userId: req.user!.id,
                role: { in: ['admin', 'editor'] }
              } 
            } 
          }
        ]
      }
    });

    if (!workspace) {
      return errorResponse(res, 'Workspace not found or insufficient permissions', 403);
    }

    // Move the workflow
    const updated = await prisma.workflow.update({
      where: { id },
      data: { workspaceId }
    });

    return successResponse(res, { 
      message: 'Workflow moved successfully',
      workflow: updated 
    });
  } catch (error: any) {
    console.error('Move workflow error:', error);
    return errorResponse(res, 'Failed to move workflow', 500);
  }
});

export default router;
