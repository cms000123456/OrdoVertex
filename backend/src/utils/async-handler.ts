import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to automatically forward errors to Express's
 * error handling middleware. Eliminates repetitive try/catch blocks.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     const data = await db.query();
 *     res.json({ success: true, data });
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next?: NextFunction) => any
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
