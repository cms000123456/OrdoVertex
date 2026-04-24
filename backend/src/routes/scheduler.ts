import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse, parsePagination } from '../utils/response';
import { redis, sendSchedulerControl, queueWorkflowExecution } from '../engine/queue';
import { rateLimit } from '../utils/rate-limit';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

// GET /api/scheduler/status — worker heartbeat + counts
router.get('/status', asyncHandler(async (req: AuthRequest, res) => {
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
}));

// GET /api/scheduler/triggers — list all scheduled triggers
router.get('/triggers', asyncHandler(async (req: AuthRequest, res) => {
  const enabledOnly = req.query.enabled === 'true';
  const { limit, offset } = parsePagination(req.query);
  const where = { type: 'schedule', ...(enabledOnly ? { enabled: true } : {}) };

  const triggers = await prisma.trigger.findMany({
    where,
    include: { workflow: { select: { id: true, name: true, active: true, userId: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    skip: offset
  });

  const filtered = req.user?.role === 'admin'
    ? triggers
    : triggers.filter(t => t.workflow.userId === req.user!.id);

  return successResponse(res, {
    triggers: filtered.map(t => ({
      id: t.id,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      workflowActive: t.workflow.active,
      enabled: t.enabled,
      config: t.config,
      lastTriggered: t.lastTriggered,
      createdAt: t.createdAt
    })),
    pagination: { total: filtered.length, limit, offset }
  });
}));

// PATCH /api/scheduler/triggers/:id — enable or disable a trigger
router.patch('/triggers/:id', asyncHandler(async (req: AuthRequest, res) => {
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
}));

// POST /api/scheduler/triggers/:id/run — manually fire a scheduled trigger now
router.post('/triggers/:id/run', rateLimit({ windowMs: 60_000, max: 20, message: 'Too many manual trigger requests, please try again later.' }), asyncHandler(async (req: AuthRequest, res) => {
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
}));

export default router;
