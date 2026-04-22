import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { getFailedJobs, retryFailedJob, deleteFailedJob, getQueueStats } from '../engine/queue';
import { asyncHandler } from 'utils/async-handler';

const router = Router();
router.use(authMiddleware);

// GET /api/queue/stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    return successResponse(res, await getQueueStats());
  } catch (error: any) {
    return errorResponse(res, 'Failed to get queue stats', 500);
  }
});

// GET /api/queue/failed
router.get('/failed', async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin') return errorResponse(res, 'Admin access required', 403);
    const startVal = parseInt(req.query.start as string, 10);
    const start = isNaN(startVal) ? 0 : startVal;
    const endVal = parseInt(req.query.end as string, 10);
    const end = isNaN(endVal) ? 49 : endVal;
    return successResponse(res, await getFailedJobs(start, end));
  } catch (error: any) {
    return errorResponse(res, 'Failed to get failed jobs', 500);
  }
});

// POST /api/queue/failed/:jobId/retry
router.post('/failed/:jobId/retry', async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin') return errorResponse(res, 'Admin access required', 403);
    return successResponse(res, await retryFailedJob(req.params.jobId));
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to retry job', 500);
  }
});

// DELETE /api/queue/failed/:jobId
router.delete('/failed/:jobId', async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin') return errorResponse(res, 'Admin access required', 403);
    return successResponse(res, await deleteFailedJob(req.params.jobId));
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to delete job', 500);
  }
});

export default router;