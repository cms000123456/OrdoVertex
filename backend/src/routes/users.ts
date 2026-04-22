import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, hashPassword } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Middleware to check if user is admin
function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'Admin access required', 403);
  }
  next();
}

// Create new user (admin only)
router.post(
  '/',
  authMiddleware,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().trim(),
    body('role').optional().isIn(['user', 'admin'])
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

    if (!requestingUser || requestingUser.role !== UserRole.admin) {
      return errorResponse(res, 'Forbidden: Admin access required', 403);
    }

    const { email, password, name, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: role as UserRole
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return successResponse(res, { user }, 201);
  })
);

// Get all users (admin only)
router.get('/', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  // Check if requesting user is admin
  const requestingUser = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { role: true }
  });

  if (!requestingUser || requestingUser.role !== UserRole.admin) {
    return errorResponse(res, 'Forbidden: Admin access required', 403);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          workflows: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return successResponse(res, { users });
}));

// Update user role (admin only)
router.patch(
  '/:id/role',
  authMiddleware,
  [
    param('id').isUUID(),
    body('role').isIn(['user', 'admin'])
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

    if (!requestingUser || requestingUser.role !== UserRole.admin) {
      return errorResponse(res, 'Forbidden: Admin access required', 403);
    }

    const { id } = req.params;
    const { role } = req.body;

    // Prevent admin from demoting themselves
    if (id === req.user!.id && role === 'user') {
      return errorResponse(res, 'Cannot demote yourself', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as UserRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    return successResponse(res, { user });
  })
);

// Delete user (admin only)
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

    if (!requestingUser || requestingUser.role !== UserRole.admin) {
      return errorResponse(res, 'Forbidden: Admin access required', 403);
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user!.id) {
      return errorResponse(res, 'Cannot delete yourself', 400);
    }

    await prisma.user.delete({
      where: { id }
    });

    return successResponse(res, { message: 'User deleted successfully' });
  })
);

export default router;