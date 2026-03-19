import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { getQueueStats } from '../engine/queue';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Get queue stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await getQueueStats();
    return successResponse(res, stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    return errorResponse(res, 'Failed to get stats', 500);
  }
});

// Get recent executions across all workflows
router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    const where: any = {
      workflow: {
        userId: req.user!.id
      }
    };

    if (status) {
      where.status = status;
    }

    const executions = await prisma.workflowExecution.findMany({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.workflowExecution.count({ where });

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

// Get execution by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id,
        workflow: {
          userId: req.user!.id
        }
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            nodes: true
          }
        },
        nodeExecutions: {
          orderBy: { startedAt: 'asc' }
        }
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

// Delete execution
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify ownership through workflow
    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id,
        workflow: {
          userId: req.user!.id
        }
      }
    });

    if (!execution) {
      return errorResponse(res, 'Execution not found', 404);
    }

    await prisma.workflowExecution.delete({
      where: { id }
    });

    return successResponse(res, { deleted: true });
  } catch (error: any) {
    console.error('Delete execution error:', error);
    return errorResponse(res, 'Failed to delete execution', 500);
  }
});

export default router;
