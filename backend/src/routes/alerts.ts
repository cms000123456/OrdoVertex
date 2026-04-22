import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware } from '../utils/auth';
import { sendEmail } from '../utils/email-sender';
import { rateLimit } from '../utils/rate-limit';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Get all alerts for user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const alerts = await prisma.alert.findMany({
    where: {
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id } } } }
      ]
    },
    include: {
      workflow: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: alerts });
}));

const VALID_CONDITION_TYPES = ['threshold', 'status', 'duration', 'error_rate'];
const VALID_NOTIFY_CHANNELS = ['email', 'webhook', 'slack', 'in_app'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAlertInput(body: any): { valid: boolean; error?: string } {
  if (!body.name || typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 200) {
    return { valid: false, error: 'Name is required and must be 1-200 characters' };
  }
  if (body.conditionType !== undefined && !VALID_CONDITION_TYPES.includes(body.conditionType)) {
    return { valid: false, error: `conditionType must be one of: ${VALID_CONDITION_TYPES.join(', ')}` };
  }
  if (body.notifyChannels !== undefined) {
    if (!Array.isArray(body.notifyChannels) || body.notifyChannels.some((c: any) => !VALID_NOTIFY_CHANNELS.includes(c))) {
      return { valid: false, error: `notifyChannels must be an array of: ${VALID_NOTIFY_CHANNELS.join(', ')}` };
    }
  }
  if (body.webhookUrl !== undefined && body.webhookUrl !== null && body.webhookUrl !== '') {
    try {
      const url = new URL(body.webhookUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { valid: false, error: 'webhookUrl must use http or https protocol' };
      }
    } catch {
      return { valid: false, error: 'webhookUrl must be a valid URL' };
    }
  }
  if (body.emailRecipients !== undefined && body.emailRecipients !== null) {
    if (!Array.isArray(body.emailRecipients) || body.emailRecipients.some((e: any) => typeof e !== 'string' || !EMAIL_REGEX.test(e))) {
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
  const history = await prisma.alertHistory.findMany({
    where: { alertId: req.params.id },
    orderBy: { triggeredAt: 'desc' },
    take: 50
  });

  res.json({ success: true, data: history });
}));

async function sendTestAlert(alert: any, user: any) {
  if (alert.notifyChannels.includes('email') && alert.emailRecipients) {
    for (const email of alert.emailRecipients) {
      await sendEmail({
        to: email,
        subject: `[TEST] Alert: ${alert.name}`,
        text: `This is a test alert for "${alert.name}".\n\nCondition: ${alert.condition}\n\nIf you receive this, your alert is configured correctly.`,
        html: `<h2>Test Alert: ${alert.name}</h2><p>This is a test alert. Your notification settings are working correctly.</p>`
      });
    }
  }
}

export default router;