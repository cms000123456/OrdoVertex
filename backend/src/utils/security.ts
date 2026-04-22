import { Request, Response, NextFunction } from 'express';
import { URL } from 'url';
import logger from '../utils/logger';

/**
 * Security utilities for OrdoVertex
 * - Error message sanitization
 * - SSRF protection
 * - Input validation helpers
 */

/**
 * Check if a URL points to an internal/private IP address
 * Prevents Server-Side Request Forgery (SSRF) attacks
 */
export function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Check for localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Check for private IP ranges
    const privateRanges = [
      /^10\./,                              // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,    // 172.16.0.0/12
      /^192\.168\./,                        // 192.168.0.0/16
      /^127\./,                             // 127.0.0.0/8 (loopback)
      /^169\.254\./,                        // 169.254.0.0/16 (link-local)
      /^0\./,                               // 0.0.0.0/8
      /^fc00:/i,                            // fc00::/7 (IPv6 unique local)
      /^fe80:/i,                            // fe80::/10 (IPv6 link-local)
      /^::1$/,                              // IPv6 loopback
    ];

    for (const range of privateRanges) {
      if (range.test(hostname)) {
        return true;
      }
    }

    // Check for cloud metadata endpoints
    const metadataEndpoints = [
      '169.254.169.254', // AWS, GCP, Azure metadata
      'metadata.google.internal',
      'metadata.aws.internal',
      '169.254.170.2',   // AWS ECS
    ];

    if (metadataEndpoints.includes(hostname)) {
      return true;
    }

    return false;
  } catch (error) {
    // Invalid URL
    return true; // Block invalid URLs as a precaution
  }
}

/**
 * Middleware to sanitize error messages in production
 * Prevents information leakage about internal system details
 */
export function errorSanitizerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If not in production, pass through
  if (process.env.NODE_ENV !== 'production') {
    return next(err);
  }

  // Sanitize the error message
  const sanitizedError = new Error('An internal error occurred');
  sanitizedError.stack = undefined;
  
  // Log the original error for debugging
  logger.error('[Security] Original error:', err.message, err.stack);

  return next(sanitizedError);
}

/**
 * Express error handler that sanitizes responses in production
 * Place this at the end of your middleware chain
 */
export function sanitizedErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || err.status || 500;
  
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    // Log detailed error server-side
    logger.error(`[Error ${statusCode}] ${req.method} ${req.path}:`, {
      message: err.message,
      stack: err.stack,
      user: (req as any).user?.id,
      ip: req.ip,
    });

    // Return generic message to client
    const message = statusCode >= 500 
      ? 'Internal server error' 
      : 'Request could not be processed';

    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: statusCode,
      },
    });
  }

  // In development, return full error details
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message,
      code: statusCode,
      stack: err.stack,
    },
  });
}

/**
 * Validate and sanitize user input for common injection patterns
 */
export function sanitizeInput(input: string): string {
  if (!input) return input;
  
  // Remove null bytes
  let sanitized = input.replace(/\x00/g, '');
  
  // Basic XSS prevention - remove script tags and event handlers
  sanitized = sanitized
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return sanitized;
}

/**
 * Validate that a string is a safe identifier (for table/column names)
 */
export function isSafeIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Environment variable validation
 * Ensures required security-related env vars are set in production
 */
export function validateSecurityEnv(): string[] {
  const issues: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // Check for default/weak secrets
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      issues.push('JWT_SECRET should be at least 32 characters in production');
    }

    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
      issues.push('ENCRYPTION_KEY should be at least 32 characters in production');
    }

    // Check for default passwords
    const defaultPasswords = ['password', 'admin', '123456', 'secret', 'changeme'];
    if (process.env.ADMIN_PASSWORD && 
        defaultPasswords.some(dp => process.env.ADMIN_PASSWORD?.toLowerCase().includes(dp))) {
      issues.push('ADMIN_PASSWORD appears to be a default/weak password');
    }

    // Check HTTPS
    if (process.env.DISABLE_HTTPS !== 'true' && !process.env.HTTPS_CERT_PATH) {
      issues.push('HTTPS should be enabled in production or DISABLE_HTTPS must be explicitly set');
    }
  }

  return issues;
}
