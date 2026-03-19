import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../utils/auth';
import { sendEmail } from '../utils/email-sender';

const router = Router();
const prisma = new PrismaClient();

// Get all alerts for user
router.get('/', authMiddleware, async (req, res) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create alert
router.post('/', authMiddleware, async (req, res) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update alert
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete alert
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test alert
router.post('/:id/test', authMiddleware, async (req, res) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get alert history
router.get('/:id/history', authMiddleware, async (req, res) => {
  try {
    const history = await prisma.alertHistory.findMany({
      where: { alertId: req.params.id },
      orderBy: { triggeredAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
