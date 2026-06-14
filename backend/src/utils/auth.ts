import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET_KEY = JWT_SECRET as string;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const passwordValidator = body('password')
  .isLength({ min: 12 }).withMessage('Password must be at least 12 characters long')
  .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[0-9]/).withMessage('Password must contain a number')
  .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain a special character');

export function generateToken(userId: string, email: string, role?: string): string {
  const payload: Record<string, unknown> = { id: userId, email };
  if (role) payload.role = role;
  // Shorter token lifetime for security (24 hours instead of 7 days)
  // Can be configured via JWT_EXPIRES_IN env var
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, JWT_SECRET_KEY, { expiresIn });
}

export function verifyToken(token: string): { id: string; email: string; role?: string } {
  return jwt.verify(token, JWT_SECRET_KEY) as { id: string; email: string; role?: string };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  // Try JWT first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Fall back to API key
  if (apiKey) {
    return apiKeyMiddleware(req, res, next);
  }

  return res.status(401).json({ error: 'Authentication required' });
}

const API_KEY_PREFIX_LENGTH = 8;
const API_KEY_SALT_ROUNDS = 12;

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, API_KEY_SALT_ROUNDS);
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, API_KEY_PREFIX_LENGTH);
}

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey || apiKey.length < API_KEY_PREFIX_LENGTH) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const prefix = getApiKeyPrefix(apiKey);

    // Look up candidate keys by prefix (new hashed keys)
    const candidateKeys = await prisma.apiKey.findMany({
      where: { keyPrefix: prefix },
      include: { user: true }
    });

    let keyRecord = null;

    for (const candidate of candidateKeys) {
      if (candidate.user.deletedAt) continue;
      if (candidate.keyHash && await bcrypt.compare(apiKey, candidate.keyHash)) {
        keyRecord = candidate;
        break;
      }
    }

    // Fallback to legacy plaintext keys (remove after all keys are migrated)
    if (!keyRecord) {
      const legacyRecord = await prisma.apiKey.findFirst({
        where: { key: apiKey },
        include: { user: true }
      });
      if (legacyRecord && !legacyRecord.user.deletedAt) {
        keyRecord = legacyRecord;
      }
    }

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() }
    });

    req.user = {
      id: keyRecord.user.id,
      email: keyRecord.user.email
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
