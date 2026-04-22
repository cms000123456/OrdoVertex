import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import crypto from 'crypto';
import logger from '../utils/logger';
import { asyncHandler } from 'utils/async-handler';

const router = Router();

// Generate a secure API key
function generateApiKey(): string {
  return 'ov_' + crypto.randomBytes(32).toString('hex');
}

// Get all API keys (admin only)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Check if requesting user is admin
    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true }
    });

    if (!requestingUser || requestingUser.role !== 'admin') {
      return errorResponse(res, 'Forbidden: Admin access required', 403);
    }

    const apiKeys = await prisma.apiKey.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return successResponse(res, { apiKeys });
  } catch (error: any) {
    logger.error('Get API keys error:', error);
    return errorResponse(res, 'Failed to get API keys', 500);
  }
});

// Create new API key (admin only)
router.post(
  '/',
  authMiddleware,
  [
    body('name').trim().isLength({ min: 1, max: 100 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      // Check if requesting user is admin
      const requestingUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { role: true }
      });

      if (!requestingUser || requestingUser.role !== 'admin') {
        return errorResponse(res, 'Forbidden: Admin access required', 403);
      }

      const { name } = req.body;
      const key = generateApiKey();

      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key,
          userId: req.user!.id
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      return successResponse(res, { apiKey }, 201);
    } catch (error: any) {
      logger.error('Create API key error:', error);
      return errorResponse(res, 'Failed to create API key', 500);
    }
  }
);

// Delete API key (admin only)
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      // Check if requesting user is admin
      const requestingUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { role: true }
      });

      if (!requestingUser || requestingUser.role !== 'admin') {
        return errorResponse(res, 'Forbidden: Admin access required', 403);
      }

      const { id } = req.params;

      await prisma.apiKey.delete({
        where: { id }
      });

      return successResponse(res, { message: 'API key deleted successfully' });
    } catch (error: any) {
      logger.error('Delete API key error:', error);
      return errorResponse(res, 'Failed to delete API key', 500);
    }
  }
);

export default router;