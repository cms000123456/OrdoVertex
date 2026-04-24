import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware } from '../utils/auth';
import { sendEmail } from '../utils/email-sender';
import { rateLimit } from '../utils/rate-limit';
import { isInternalUrl } from '../utils/security';
import { parsePagination } from '../utils/response';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Get all alerts for user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const where = {
    OR: [
      { userId: req.user!.id },
      { workspace: { members: { some: { userId: req.user!.id } } } }
    ]
  };
  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        workflow: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.alert.count({ where })
  ]);

  res.json({ success: true, data: alerts, pagination: { total, limit, offset } });
}));

const VALID_CONDITION_TYPES = ['threshold', 'status', 'duration', 'error_rate'];
const VALID_NOTIFY_CHANNELS = ['email', 'webhook', 'slack', 'in_app'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAlertInput(body: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!body.name || typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 200) {
    return { valid: false, error: 'Name is required and must be 1-200 characters' };
  }
  if (body.conditionType !== undefined && typeof body.conditionType === 'string' && !VALID_CONDITION_TYPES.includes(body.conditionType)) {
    return { valid: false, error: `conditionType must be one of: ${VALID_CONDITION_TYPES.join(', ')}` };
  }
  if (body.notifyChannels !== undefined) {
    if (!Array.isArray(body.notifyChannels) || body.notifyChannels.some((c: unknown) => typeof c === 'string' && !VALID_NOTIFY_CHANNELS.includes(c))) {
      return { valid: false, error: `notifyChannels must be an array of: ${VALID_NOTIFY_CHANNELS.join(', ')}` };
    }
  }
  if (body.webhookUrl !== undefined && body.webhookUrl !== null && body.webhookUrl !== '') {
    try {
      const url = new URL(body.webhookUrl as string);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { valid: false, error: 'webhookUrl must use http or https protocol' };
      }
      if (isInternalUrl(body.webhookUrl as string)) {
        return { valid: false, error: 'webhookUrl must not point to internal addresses' };
      }
    } catch {
      return { valid: false, error: 'webhookUrl must be a valid URL' };
    }
  }
  if (body.emailRecipients !== undefined && body.emailRecipients !== null) {
    if (!Array.isArray(body.emailRecipients) || body.emailRecipients.some((e: unknown) => typeof e !== 'string' || (typeof e === 'string' && !EMAIL_REGEX.test(e)))) {
      return { valid: false, error: 'emailRecipients must be an array of valid email addresses' };
    }
  }
  return { valid: true };
}

// Create alert
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const validation = validateAlertInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const {
    name,
    workflowId,
    workspaceId,
    condition,
    conditionType,
    notifyChannels,
    emailRecipients,
    webhookUrl,
    isActive
  } = req.body;

  const alert = await prisma.alert.create({
    data: {
      name,
      userId: req.user!.id,
      workflowId: workflowId || null,
      workspaceId: workspaceId || null,
      condition,
      conditionType,
      notifyChannels,
      emailRecipients,
      webhookUrl,
      isActive: isActive ?? true
    }
  });

  res.json({ success: true, data: alert });
}));

// Update alert
router.patch('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const alert = await prisma.alert.updateMany({
    where: {
      id: req.params.id,
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id, role: { in: ['admin', 'owner'] } } } } }
      ]
    },
    data: req.body
  });

  if (alert.count === 0) {
    return res.status(404).json({ success: false, error: 'Alert not found or insufficient permissions' });
  }

  res.json({ success: true });
}));

// Delete alert
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const alert = await prisma.alert.deleteMany({
    where: {
      id: req.params.id,
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id, role: { in: ['admin', 'owner'] } } } } }
      ]
    }
  });

  if (alert.count === 0) {
    return res.status(404).json({ success: false, error: 'Alert not found or insufficient permissions' });
  }

  res.json({ success: true });
}));

// Test alert
router.post('/:id/test', authMiddleware, rateLimit({ windowMs: 60_000, max: 10, message: 'Too many test alert requests, please try again later.' }), asyncHandler(async (req, res) => {
  const alert = await prisma.alert.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id } } } }
      ]
    }
  });

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }

  // Send test notification
  await sendTestAlert(alert, req.user!);

  res.json({ success: true, message: 'Test alert sent' });
}));

// Get alert history
router.get('/:id/history', authMiddleware, asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req.query, 200);
  const [history, total] = await Promise.all([
    prisma.alertHistory.findMany({
      where: { alertId: req.params.id },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.alertHistory.count({ where: { alertId: req.params.id } })
  ]);

  res.json({ success: true, data: history, pagination: { total, limit, offset } });
}));

async function sendTestAlert(alert: Record<string, unknown>, user: { email?: string }) {
  const notifyChannels = alert.notifyChannels as string[] | undefined;
  const emailRecipients = alert.emailRecipients as string[] | undefined;
  const alertName = alert.name as string | undefined;
  if (notifyChannels?.includes('email') && emailRecipients) {
    for (const email of emailRecipients) {
      await sendEmail({
        to: email,
        subject: `[TEST] Alert: ${alertName}`,
        text: `This is a test alert for "${alertName}".\n\nCondition: ${alert.condition}\n\nIf you receive this, your alert is configured correctly.`,
        html: `<h2>Test Alert: ${alertName}</h2><p>This is a test alert. Your notification settings are working correctly.</p>`
      });
    }
  }
}

export default router;