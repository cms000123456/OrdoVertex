import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, hashApiKey, getApiKeyPrefix } from '../utils/auth';
import { successResponse, errorResponse, parsePagination } from '../utils/response';
import crypto from 'crypto';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Generate a secure API key
function generateApiKey(): string {
  return 'ov_' + crypto.randomBytes(32).toString('hex');
}

// Get all API keys (admin only)
router.get('/', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  // Check if requesting user is admin
  const requestingUser = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { role: true }
  });

  if (!requestingUser || requestingUser.role !== 'admin') {
    return errorResponse(res, 'Forbidden: Admin access required', 403);
  }

  const { limit, offset } = parsePagination(req.query);
  const [apiKeys, total] = await Promise.all([
    prisma.apiKey.findMany({
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
      },
      take: limit,
      skip: offset
    }),
    prisma.apiKey.count()
  ]);

  // Never expose key hashes or legacy plaintext keys
  const sanitizedApiKeys = apiKeys.map((apiKey) => ({
    ...apiKey,
    key: apiKey.keyPrefix,
    keyHash: undefined,
    keyPrefix: undefined
  }));

  return successResponse(res, { apiKeys: sanitizedApiKeys, pagination: { total, limit, offset } });
}));

// Create new API key (admin only)
router.post(
  '/',
  authMiddleware,
  [
    body('name').trim().isLength({ min: 1, max: 100 })
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
    const plaintextKey = generateApiKey();
    const keyHash = await hashApiKey(plaintextKey);
    const keyPrefix = getApiKeyPrefix(plaintextKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: null, // plaintext key is never persisted
        keyHash,
        keyPrefix,
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

    // Return the plaintext key only once; it cannot be retrieved again
    return successResponse(res, {
      apiKey: {
        ...apiKey,
        key: plaintextKey,
        keyHash: undefined
      }
    }, 201);
}));

// Delete API key (admin only)
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
}));

export default router;