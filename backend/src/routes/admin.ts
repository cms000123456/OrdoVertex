import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, adminMiddleware, AuthRequest } from '../utils/auth';
import { asyncHandler } from '../utils/async-handler';
import { getErrorMessage } from '../utils/error-helper';
import logger from '../utils/logger';

const router = Router();
const authenticateToken = authMiddleware;

// Get all workflows (admin only)
router.get('/workflows', authenticateToken, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
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
}));

// Delete any workflow (admin only)
router.delete('/workflows/:id', authenticateToken, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  await prisma.workflow.delete({ where: { id } });
  res.json({ success: true, message: 'Workflow deleted' });
}));

// Move workflow to different workspace (admin only)
router.post('/workflows/:id/move', authenticateToken, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { workspaceId } = req.body;

  if (workspaceId) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
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
      user: { select: { id: true, email: true, name: true } },
      workspace: { select: { id: true, name: true } },
      _count: { select: { executions: true } }
    }
  });

  res.json({
    success: true,
    message: workspaceId ? 'Workflow moved to workspace' : 'Workflow moved to personal',
    data: updated
  });
}));

// Toggle workflow active state (admin only)
router.patch('/workflows/:id/toggle', authenticateToken, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
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
      user: { select: { id: true, email: true, name: true } },
      workspace: { select: { id: true, name: true } },
      _count: { select: { executions: true } }
    }
  });

  res.json({ success: true, data: updated });
}));

// Get system stats (admin only)
router.get('/system-stats', authenticateToken, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const os = await import('os');

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

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
    diskStats = { total: totalMem * 2, used: usedMem, free: totalMem * 2 - usedMem };
  }

  const stats = {
    cpu: {
      usage: os.loadavg()[0] * 10,
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
}));

export default router;
