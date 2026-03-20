import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // 100 requests per window
  const message = options.message || 'Too many requests, please try again later.';

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    if (store[key] && store[key].resetTime < now) {
      delete store[key];
    }

    // Initialize or update rate limit data
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      store[key].count++;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count));
    res.setHeader('X-RateLimit-Reset', store[key].resetTime);

    // Check if limit exceeded
    if (store[key].count > max) {
      return res.status(429).json({
        success: false,
        error: {
          message,
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
        }
      });
    }

    next();
  };
}

// Stricter rate limiting for auth endpoints
// Configurable via environment variables for development
export function authRateLimit(options: RateLimitOptions = {}) {
  // Development: 100 attempts per minute
  // Production: 5 attempts per 15 minutes
  const isDev = process.env.NODE_ENV !== 'production';
  const defaultMax = isDev ? 100 : 5;
  const defaultWindowMs = isDev ? 60 * 1000 : 15 * 60 * 1000; // 1 min in dev, 15 min in prod
  
  // Allow override via env vars
  const max = parseInt(process.env.AUTH_RATE_LIMIT_MAX || String(defaultMax), 10);
  const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(defaultWindowMs), 10);
  
  return rateLimit({
    windowMs,
    max,
    message: 'Too many authentication attempts, please try again later.',
    ...options
  });
}

// API key rate limiting (more permissive)
export function apiRateLimit(options: RateLimitOptions = {}) {
  const max = parseInt(process.env.API_RATE_LIMIT_MAX || '60', 10);
  const windowMs = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000', 10);
  
  return rateLimit({
    windowMs,
    max,
    message: 'API rate limit exceeded.',
    ...options
  });
}
