import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware } from '../utils/auth';
import { asyncHandler } from '../utils/async-handler';
const authenticateToken = authMiddleware;

const router = Router();

// Get execution logs
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    executionId,
    workflowId,
    level,
    nodeId,
    startDate,
    endDate,
    search,
    page = '1',
    limit = '50'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.max(1, parseInt(limit as string) || 50);
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

  // Get user's accessible workflow IDs
  const userWorkflows = await prisma.workflow.findMany({
    where: {
      deletedAt: null,
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id } } } }
      ]
    },
    select: { id: true }
  });

  const workflowIds = userWorkflows.map(w => w.id);

  const where: Record<string, unknown> = {
    execution: {
      workflowId: { in: workflowIds }
    }
  };

  if (executionId) {
    where.executionId = executionId as string;
  }

  if (workflowId) {
    // Verify user has access to this workflow
    if (!workflowIds.includes(workflowId as string)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    where.execution = {
      workflowId: workflowId as string
    };
  }

  if (level) {
    where.level = level as string;
  }

  if (nodeId) {
    where.nodeId = nodeId as string;
  }

  if (startDate || endDate) {
    const ts = {} as Record<string, Date>;
    if (startDate) {
      ts.gte = new Date(startDate as string);
    }
    if (endDate) {
      ts.lte = new Date(endDate as string);
    }
    where.timestamp = ts;
  }

  if (search) {
    where.message = {
      contains: search as string,
      mode: 'insensitive'
    };
  }

  const [logs, total] = await Promise.all([
    prisma.executionLog.findMany({
      where,
      include: {
        execution: {
          select: {
            id: true,
            workflowId: true,
            status: true,
            startedAt: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take
    }),
    prisma.executionLog.count({ where })
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: parseInt(page as string),
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  });
}));

// Get execution details with logs
router.get('/execution/:executionId', authenticateToken, asyncHandler(async (req, res) => {
  const execution = await prisma.workflowExecution.findFirst({
    where: {
      id: req.params.executionId,
      workflow: {
        OR: [
          { userId: req.user!.id },
          { workspace: { members: { some: { userId: req.user!.id } } } }
        ]
      }
    },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
          userId: true,
          workspaceId: true
        }
      },
      nodeExecutions: {
        orderBy: { startedAt: 'asc' }
      },
      executionLogs: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!execution) {
    return res.status(404).json({ success: false, error: 'Execution not found' });
  }

  res.json({ success: true, data: execution });
}));

// Get execution statistics
router.get('/stats/overview', authenticateToken, asyncHandler(async (req, res) => {
  const { workflowId, days = '7' } = req.query;
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

  const where: Record<string, unknown> = {
    startedAt: {
      gte: daysAgo
    }
  };

  if (workflowId) {
    where.workflowId = workflowId as string;
  }

  // Get user's workflows
  const userWorkflows = await prisma.workflow.findMany({
    where: {
      deletedAt: null,
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id } } } }
      ]
    },
    select: { id: true }
  });

  const workflowIds = userWorkflows.map(w => w.id);
  where.workflowId = { in: workflowIds };

  const [
    totalExecutions,
    statusCounts,
    avgDuration,
    recentLogs
  ] = await Promise.all([
    prisma.workflowExecution.count({ where }),
    prisma.workflowExecution.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    }),
    prisma.workflowExecution.aggregate({
      where: { ...where, duration: { not: null } },
      _avg: { duration: true }
    }),
    prisma.executionLog.findMany({
      where: {
        level: 'error',
        execution: { workflowId: { in: workflowIds } }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        execution: {
          select: {
            workflowId: true,
            workflow: { select: { name: true } }
          }
        }
      }
    })
  ]);

  const stats = {
    totalExecutions,
    statusBreakdown: statusCounts.reduce((acc: Record<string, number>, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {}),
    averageDuration: avgDuration._avg.duration || 0,
    recentErrors: recentLogs
  };

  res.json({ success: true, data: stats });
}));

// Get execution timeline (for visualization)
router.get('/timeline', authenticateToken, asyncHandler(async (req, res) => {
  const { workflowId, hours = '24' } = req.query;
  const hoursAgo = new Date();
  hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours as string));

  // Get user's accessible workflow IDs
  const userWorkflows = await prisma.workflow.findMany({
    where: {
      deletedAt: null,
      OR: [
        { userId: req.user!.id },
        { workspace: { members: { some: { userId: req.user!.id } } } }
      ]
    },
    select: { id: true }
  });

  const workflowIds = userWorkflows.map(w => w.id);

  const where: Record<string, unknown> = {
    startedAt: {
      gte: hoursAgo
    },
    workflowId: { in: workflowIds }
  };

  if (workflowId) {
    // Verify user has access to this workflow
    if (!workflowIds.includes(workflowId as string)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    where.workflowId = workflowId as string;
  }

  const executions = await prisma.workflowExecution.findMany({
    where,
    select: {
      id: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      duration: true,
      workflowId: true,
      workflow: {
        select: { name: true }
      },
      _count: {
        select: { executionLogs: true }
      }
    },
    orderBy: { startedAt: 'desc' }
  });

  res.json({ success: true, data: executions });
}));

// Export logs
router.get('/export', authenticateToken, asyncHandler(async (req, res) => {
  const { executionId, format = 'json' } = req.query;

  if (!executionId) {
    return res.status(400).json({ success: false, error: 'executionId is required' });
  }

  // Verify user has access to this execution
  const execution = await prisma.workflowExecution.findFirst({
    where: {
      id: executionId as string,
      workflow: {
        OR: [
          { userId: req.user!.id },
          { workspace: { members: { some: { userId: req.user!.id } } } }
        ]
      }
    }
  });

  if (!execution) {
    return res.status(404).json({ success: false, error: 'Execution not found' });
  }

  const logs = await prisma.executionLog.findMany({
    where: { executionId: executionId as string },
    orderBy: { timestamp: 'asc' }
  });

  if (format === 'csv') {
    const csv = logs.map(log =>
      `${log.timestamp.toISOString()},${log.level},${log.nodeName || ''},"${log.message.replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="execution-${executionId}-logs.csv"`);
    res.send('timestamp,level,node,message\n' + csv);
  } else {
    res.json({ success: true, data: logs });
  }
}));

export default router;