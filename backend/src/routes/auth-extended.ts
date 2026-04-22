import { Router } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { authRateLimit } from '../utils/rate-limit';
import crypto from 'crypto';
import logger from '../utils/logger';
import { asyncHandler } from 'utils/async-handler';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// ==================== MFA Routes ====================

// Generate MFA secret and QR code
router.post('/mfa/setup', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `OrdoVertex:${user.email}`,
      issuer: 'OrdoVertex'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Temporarily store secret (not verified yet)
    await prisma.mFASettings.upsert({
      where: { userId },
      create: {
        userId,
        totpSecret: secret.base32,
        totpEnabled: false,
        totpVerified: false
      },
      update: {
        totpSecret: secret.base32,
        totpEnabled: false,
        totpVerified: false
      }
    });

    return successResponse(res, {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error: any) {
    logger.error('MFA setup error:', error);
    return errorResponse(res, 'Failed to setup MFA', 500);
  }
});

// Verify and enable MFA
router.post('/mfa/verify', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    const userId = req.user!.id;

    const mfaSettings = await prisma.mFASettings.findUnique({
      where: { userId }
    });

    if (!mfaSettings || !mfaSettings.totpSecret) {
      return errorResponse(res, 'MFA not set up', 400);
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: mfaSettings.totpSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 steps (60 seconds) time drift
    });

    if (!verified) {
      return errorResponse(res, 'Invalid verification code', 400);
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable MFA
    await prisma.mFASettings.update({
      where: { userId },
      data: {
        totpEnabled: true,
        totpVerified: true,
        backupCodes: backupCodes.join(','),
        lastVerifiedAt: new Date()
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });

    return successResponse(res, {
      message: 'MFA enabled successfully',
      backupCodes
    });
  } catch (error: any) {
    logger.error('MFA verify error:', error);
    return errorResponse(res, 'Failed to verify MFA', 500);
  }
});

// Disable MFA
router.post('/mfa/disable', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { token, password } = req.body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password!);
    if (!validPassword) {
      return errorResponse(res, 'Invalid password', 400);
    }

    const mfaSettings = await prisma.mFASettings.findUnique({
      where: { userId }
    });

    if (!mfaSettings || !mfaSettings.totpEnabled) {
      return errorResponse(res, 'MFA is not enabled', 400);
    }

    // Verify MFA token
    const verified = speakeasy.totp.verify({
      secret: mfaSettings.totpSecret!,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return errorResponse(res, 'Invalid verification code', 400);
    }

    // Disable MFA
    await prisma.mFASettings.update({
      where: { userId },
      data: {
        totpEnabled: false,
        totpVerified: false,
        totpSecret: null,
        backupCodes: null,
        backupCodesUsed: 0
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false }
    });

    return successResponse(res, { message: 'MFA disabled successfully' });
  } catch (error: any) {
    logger.error('MFA disable error:', error);
    return errorResponse(res, 'Failed to disable MFA', 500);
  }
});

// Get MFA status
router.get('/mfa/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const mfaSettings = await prisma.mFASettings.findUnique({
      where: { userId }
    });

    return successResponse(res, {
      enabled: mfaSettings?.totpEnabled || false,
      verified: mfaSettings?.totpVerified || false,
      backupCodesAvailable: mfaSettings?.backupCodes ? 
        mfaSettings.backupCodes.split(',').length - mfaSettings.backupCodesUsed : 0,
      lastVerifiedAt: mfaSettings?.lastVerifiedAt
    });
  } catch (error: any) {
    logger.error('MFA status error:', error);
    return errorResponse(res, 'Failed to get MFA status', 500);
  }
});

// Use backup code
router.post('/mfa/backup', authRateLimit(), async (req, res) => {
  try {
    const { email, backupCode } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.mfaEnabled) {
      return errorResponse(res, 'Invalid request', 400);
    }

    const mfaSettings = await prisma.mFASettings.findUnique({
      where: { userId: user.id }
    });

    if (!mfaSettings || !mfaSettings.backupCodes) {
      return errorResponse(res, 'No backup codes available', 400);
    }

    const codes = mfaSettings.backupCodes.split(',');
    const codeIndex = codes.findIndex(c => c === backupCode.toUpperCase());

    if (codeIndex === -1) {
      return errorResponse(res, 'Invalid backup code', 400);
    }

    // Remove used code
    codes.splice(codeIndex, 1);
    
    await prisma.mFASettings.update({
      where: { userId: user.id },
      data: {
        backupCodes: codes.join(','),
        backupCodesUsed: { increment: 1 }
      }
    });

    // Generate auth token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      backupCodesRemaining: codes.length
    });
  } catch (error: any) {
    logger.error('Backup code error:', error);
    return errorResponse(res, 'Failed to use backup code', 500);
  }
});

// ==================== SAML SSO Routes ====================

// Get SAML configuration (admin only)
router.get('/saml/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return errorResponse(res, 'Admin access required', 403);
    }

    const configs = await prisma.sAMLConfig.findMany({
      select: {
        id: true,
        provider: true,
        entityId: true,
        entryPoint: true,
        callbackUrl: true,
        logoutUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return successResponse(res, configs);
  } catch (error: any) {
    logger.error('SAML config error:', error);
    return errorResponse(res, 'Failed to get SAML config', 500);
  }
});

// Create SAML configuration (admin only)
router.post('/saml/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return errorResponse(res, 'Admin access required', 403);
    }

    const {
      provider,
      entityId,
      entryPoint,
      cert,
      privateKey,
      callbackUrl,
      logoutUrl,
      nameIdFormat,
      wantAssertionsSigned,
      wantResponseSigned
    } = req.body;

    const config = await prisma.sAMLConfig.create({
      data: {
        provider,
        entityId,
        entryPoint,
        cert,
        privateKey,
        callbackUrl,
        logoutUrl,
        nameIdFormat,
        wantAssertionsSigned,
        wantResponseSigned
      }
    });

    return successResponse(res, {
      message: 'SAML configuration created',
      config: {
        id: config.id,
        provider: config.provider,
        entityId: config.entityId,
        isActive: config.isActive
      }
    });
  } catch (error: any) {
    logger.error('SAML config create error:', error);
    return errorResponse(res, 'Failed to create SAML config', 500);
  }
});

// Update SAML configuration (admin only)
router.patch('/saml/config/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return errorResponse(res, 'Admin access required', 403);
    }

    const { id } = req.params;
    const updateData = req.body;

    const config = await prisma.sAMLConfig.update({
      where: { id },
      data: updateData
    });

    return successResponse(res, {
      message: 'SAML configuration updated',
      config
    });
  } catch (error: any) {
    logger.error('SAML config update error:', error);
    return errorResponse(res, 'Failed to update SAML config', 500);
  }
});

// Delete SAML configuration (admin only)
router.delete('/saml/config/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return errorResponse(res, 'Admin access required', 403);
    }

    const { id } = req.params;

    await prisma.sAMLConfig.delete({ where: { id } });

    return successResponse(res, { message: 'SAML configuration deleted' });
  } catch (error: any) {
    logger.error('SAML config delete error:', error);
    return errorResponse(res, 'Failed to delete SAML config', 500);
  }
});

// Get available SAML providers
router.get('/saml/providers', async (req, res) => {
  try {
    const providers = await prisma.sAMLConfig.findMany({
      where: { isActive: true },
      select: {
        id: true,
        provider: true,
        entryPoint: true
      }
    });

    return successResponse(res, providers);
  } catch (error: any) {
    logger.error('SAML providers error:', error);
    return errorResponse(res, 'Failed to get SAML providers', 500);
  }
});

export default router;