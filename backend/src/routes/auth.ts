import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../prisma';
import crypto from 'crypto';
import { hashPassword, verifyPassword, generateToken, authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { authRateLimit } from '../utils/rate-limit';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { getSecuritySettings, getBaseUrl } from './system';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

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
  asyncHandler(async (req: Request, res: Response) => {
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

    // Check if email verification is required
    const securitySettings = getSecuritySettings();
    const requireEmailVerification = securitySettings.requireEmailVerification;

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: !requireEmailVerification // Auto-verify if not required
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Send verification email if required
    if (requireEmailVerification) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

      await prisma.verificationToken.create({
        data: {
          email,
          token: verificationToken,
          expiresAt
        }
      });

      // Send verification email
      const baseUrl = getBaseUrl();
      const emailResult = await sendVerificationEmail(
        email,
        name || email,
        verificationToken,
        baseUrl
      );

      if (!emailResult.success) {
        logger.error('[Auth] Failed to send verification email:', emailResult.error);
      }

      return successResponse(res, {
        user,
        message: 'Registration successful. Please check your email to verify your account.',
        verificationSent: emailResult.success,
        requiresVerification: true
      }, 201);
    }

    const token = generateToken(user.id, user.email);

    return successResponse(res, { user, token }, 201);
}));

// Login
router.post(
  '/login',
  authRateLimit(),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  asyncHandler(async (req: Request, res: Response) => {
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

    // Check if email verification is required
    const securitySettings = getSecuritySettings();
    if (securitySettings.requireEmailVerification && !user.emailVerified) {
      return errorResponse(res, 'Please verify your email before logging in. Check your inbox for the verification link.', 403, {
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
    }

    const token = generateToken(user.id, user.email, user.role);

    return successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted
      },
      token
    });
}));

// Complete onboarding (change default credentials)
router.post(
  '/onboarding',
  authMiddleware,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;
    const userId = req.user!.id;

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== userId) {
      return errorResponse(res, 'Email is already in use', 409);
    }

    // Update user with new credentials and mark onboarding as complete
    const hashedPassword = await hashPassword(password);
      
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        password: hashedPassword,
        onboardingCompleted: true
      }
    });

    // Generate new token with updated email
    const token = generateToken(user.id, user.email, user.role);

    return successResponse(res, {
      message: 'Onboarding completed successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: true
      },
      token
    });
}));

// Get current user
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      mfaEnabled: true,
      onboardingCompleted: true,
      createdAt: true
    }
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  return successResponse(res, { user });
}));

// Verify email with token
router.post('/verify-email', authRateLimit(), asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return errorResponse(res, 'Verification token is required', 400);
  }

  // Find the verification token
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token }
  });

  if (!verificationToken) {
    return errorResponse(res, 'Invalid or expired verification token', 400);
  }

  // Check if token has expired
  if (new Date() > verificationToken.expiresAt) {
    // Delete expired token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    });
    return errorResponse(res, 'Verification token has expired. Please request a new one.', 400);
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: verificationToken.email }
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Mark email as verified
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true }
  });

  // Delete the verification token
  await prisma.verificationToken.delete({
    where: { id: verificationToken.id }
  });

  // Generate auth token for automatic login
  const authToken = generateToken(user.id, user.email, user.role);

  return successResponse(res, {
    message: 'Email verified successfully',
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: true
    }
  });
}));

// Resend verification email
router.post('/resend-verification', authRateLimit(), asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return errorResponse(res, 'Email is required', 400);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    // Don't reveal if user exists
    return successResponse(res, {
      message: 'If an account exists with this email, a verification link has been sent.'
    });
  }

  // Check if already verified
  if (user.emailVerified) {
    return successResponse(res, {
      message: 'If an account exists with this email, a verification link has been sent.'
    });
  }

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { email }
  });

  // Generate new token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.verificationToken.create({
    data: {
      email,
      token: verificationToken,
      expiresAt
    }
  });

  // Send verification email
  const baseUrl = getBaseUrl();
  const emailResult = await sendVerificationEmail(
    email,
    user.name || email,
    verificationToken,
    baseUrl
  );

  if (!emailResult.success) {
    logger.error('[Auth] Failed to send verification email:', emailResult.error);
  }

  return successResponse(res, {
    message: 'If an account exists with this email, a verification link has been sent.'
  });
}));

export default router;