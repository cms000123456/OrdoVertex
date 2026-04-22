import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { redis, sendSchedulerControl, queueWorkflowExecution } from '../engine/queue';
import { rateLimit } from '../utils/rate-limit';

const router = Router();

router.use(authMiddleware);

// GET /api/scheduler/status — worker heartbeat + counts
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const [total, enabled, heartbeatRaw] = await Promise.all([
      prisma.trigger.count({ where: { type: 'schedule' } }),
      prisma.trigger.count({ where: { type: 'schedule', enabled: true } }),
      redis.get('worker:heartbeat')
    ]);

    const heartbeatMs = heartbeatRaw ? parseInt(heartbeatRaw, 10) : null;
    const workerAlive = heartbeatMs !== null ? (Date.now() - heartbeatMs) < 120_000 : false;

    return successResponse(res, {
      worker: { alive: workerAlive, lastSeen: heartbeatMs ? new Date(heartbeatMs).toISOString() : null },
      triggers: { total, enabled, disabled: total - enabled }
    });
  } catch (error: any) {
    return errorResponse(res, 'Failed to get scheduler status', 500);
  }
});

// GET /api/scheduler/triggers — list all scheduled triggers
router.get('/triggers', async (req: AuthRequest, res) => {
  try {
    const enabledOnly = req.query.enabled === 'true';
    const triggers = await prisma.trigger.findMany({
      where: { type: 'schedule', ...(enabledOnly ? { enabled: true } : {}) },
      include: { workflow: { select: { id: true, name: true, active: true, userId: true } } },
      orderBy: { createdAt: 'asc' }
    });

    // Only return triggers the user owns (or all if admin)
    const filtered = req.user?.role === 'admin'
      ? triggers
      : triggers.filter(t => t.workflow.userId === req.user!.id);

    return successResponse(res, filtered.map(t => ({
      id: t.id,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      workflowActive: t.workflow.active,
      enabled: t.enabled,
      config: t.config,
      lastTriggered: t.lastTriggered,
      createdAt: t.createdAt
    })));
  } catch (error: any) {
    return errorResponse(res, 'Failed to list triggers', 500);
  }
});

// PATCH /api/scheduler/triggers/:id — enable or disable a trigger
router.patch('/triggers/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return errorResponse(res, 'enabled (boolean) is required', 400);

    const trigger = await prisma.trigger.findUnique({
      where: { id },
      include: { workflow: { select: { userId: true } } }
    });

    if (!trigger) return errorResponse(res, 'Trigger not found', 404);
    if (req.user?.role !== 'admin' && trigger.workflow.userId !== req.user!.id) {
      return errorResponse(res, 'Not authorized', 403);
    }

    const updated = await prisma.trigger.update({ where: { id }, data: { enabled } });

    const config = trigger.config as { cron: string; timezone?: string };
    if (enabled) {
      await sendSchedulerControl('schedule', trigger.workflowId, config);
    } else {
      await sendSchedulerControl('unschedule', trigger.workflowId);
    }

    return successResponse(res, { id: updated.id, workflowId: updated.workflowId, enabled: updated.enabled });
  } catch (error: any) {
    return errorResponse(res, 'Failed to update trigger', 500);
  }
});

// POST /api/scheduler/triggers/:id/run — manually fire a scheduled trigger now
router.post('/triggers/:id/run', rateLimit({ windowMs: 60_000, max: 20, message: 'Too many manual trigger requests, please try again later.' }), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const trigger = await prisma.trigger.findUnique({
      where: { id },
      include: { workflow: { select: { userId: true, active: true } } }
    });

    if (!trigger) return errorResponse(res, 'Trigger not found', 404);
    if (req.user?.role !== 'admin' && trigger.workflow.userId !== req.user!.id) {
      return errorResponse(res, 'Not authorized', 403);
    }

    const job = await queueWorkflowExecution(trigger.workflowId, req.user!.id, {}, 'schedule');
    return successResponse(res, { queued: true, jobId: job.id });
  } catch (error: any) {
    return errorResponse(res, 'Failed to run trigger', 500);
  }
});

export default router;
