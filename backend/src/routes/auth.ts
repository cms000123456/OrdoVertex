import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, generateToken, authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { authRateLimit } from '../utils/rate-limit';

const router = Router();
const prisma = new PrismaClient();

// Apply rate limiting to auth endpoints
router.use(authRateLimit());

// Register
router.post(
  '/register',
  authRateLimit(),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return errorResponse(res, 'User already exists', 409);
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      const token = generateToken(user.id, user.email);

      return successResponse(res, { user, token }, 201);
    } catch (error: any) {
      console.error('Registration error:', error);
      return errorResponse(res, 'Registration failed', 500);
    }
  }
);

// Login
router.post(
  '/login',
  authRateLimit(),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { email, password, mfaToken } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password!);
      if (!isValid) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // If no MFA token provided, return challenge
        if (!mfaToken) {
          return successResponse(res, {
            mfaRequired: true,
            message: 'MFA verification required'
          });
        }

        // Verify MFA token
        const mfaSettings = await prisma.mFASettings.findUnique({
          where: { userId: user.id }
        });

        if (!mfaSettings || !mfaSettings.totpEnabled) {
          return errorResponse(res, 'MFA configuration error', 500);
        }

        const speakeasy = await import('speakeasy');
        const verified = speakeasy.default.totp.verify({
          secret: mfaSettings.totpSecret!,
          encoding: 'base32',
          token: mfaToken,
          window: 2
        });

        if (!verified) {
          return errorResponse(res, 'Invalid MFA code', 401);
        }

        // Update last verified
        await prisma.mFASettings.update({
          where: { userId: user.id },
          data: { lastVerifiedAt: new Date() }
        });
      }

      const token = generateToken(user.id, user.email, user.role);

      return successResponse(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaEnabled: user.mfaEnabled
        },
        token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return errorResponse(res, 'Login failed', 500);
    }
  }
);

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, { user });
  } catch (error: any) {
    console.error('Get user error:', error);
    return errorResponse(res, 'Failed to get user', 500);
  }
});

export default router;
