import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse, validateUUID, handleValidationErrors } from '../utils/response';
import { getQueueStats } from '../engine/queue';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

// Get queue stats
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  const stats = await getQueueStats();
  return successResponse(res, stats);
}));

// Get recent executions across all workflows
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const limitVal = parseInt(req.query.limit as string, 10);
  const limit = isNaN(limitVal) ? 20 : limitVal;
  const offsetVal = parseInt(req.query.offset as string, 10);
  const offset = isNaN(offsetVal) ? 0 : offsetVal;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {
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
}));

// Get execution by ID
router.get('/:id', validateUUID(), handleValidationErrors, asyncHandler(async (req: AuthRequest, res) => {
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
}));

// Delete execution
router.delete('/:id', validateUUID(), handleValidationErrors, asyncHandler(async (req: AuthRequest, res) => {
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
}));

// Get node execution data for a specific node in an execution
router.get('/:executionId/nodes/:nodeId', validateUUID('executionId'), validateUUID('nodeId'), handleValidationErrors, asyncHandler(async (req: AuthRequest, res) => {
  const { executionId, nodeId } = req.params;

  // Verify execution ownership
  const execution = await prisma.workflowExecution.findFirst({
    where: {
      id: executionId,
      workflow: {
        userId: req.user!.id
      }
    }
  });

  if (!execution) {
    return errorResponse(res, 'Execution not found', 404);
  }

  // Get node execution
  const nodeExecution = await prisma.nodeExecution.findFirst({
    where: {
      executionId,
      nodeId
    },
    orderBy: { startedAt: 'desc' } // Get most recent if multiple
  });

  if (!nodeExecution) {
    return errorResponse(res, 'Node execution not found', 404);
  }

  return successResponse(res, {
    nodeExecution: {
      id: nodeExecution.id,
      nodeId: nodeExecution.nodeId,
      nodeName: nodeExecution.nodeName,
      status: nodeExecution.status,
      input: nodeExecution.input,
      output: nodeExecution.output,
      error: nodeExecution.error,
      startedAt: nodeExecution.startedAt,
      finishedAt: nodeExecution.finishedAt,
      duration: nodeExecution.finishedAt && nodeExecution.startedAt
        ? new Date(nodeExecution.finishedAt).getTime() - new Date(nodeExecution.startedAt).getTime()
        : null
    }
  });
}));

export default router;