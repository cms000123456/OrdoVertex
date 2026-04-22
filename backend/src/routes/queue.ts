import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { getFailedJobs, retryFailedJob, deleteFailedJob, getQueueStats } from '../engine/queue';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
router.use(authMiddleware);

// GET /api/queue/stats
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  return successResponse(res, await getQueueStats());
}));

// GET /api/queue/failed
router.get('/failed', asyncHandler(async (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin') return errorResponse(res, 'Admin access required', 403);
  const startVal = parseInt(req.query.start as string, 10);
  const start = isNaN(startVal) ? 0 : startVal;
  const endVal = parseInt(req.query.end as string, 10);
  const end = isNaN(endVal) ? 49 : endVal;
  return successResponse(res, await getFailedJobs(start, end));
}));

// POST /api/queue/failed/:jobId/retry
router.post('/failed/:jobId/retry', asyncHandler(async (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin') return errorResponse(res, 'Admin access required', 403);
  return successResponse(res, await retryFailedJob(req.params.jobId));
}));

// DELETE /api/queue/failed/:jobId
router.delete('/failed/:jobId', asyncHandler(async (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin') return errorResponse(res, 'Admin access required', 403);
  return successResponse(res, await deleteFailedJob(req.params.jobId));
}));

export default router;
