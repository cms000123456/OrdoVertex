import { Response, Request, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function parsePagination(query: Record<string, unknown>, maxLimit = 100): PaginationParams {
  const limitVal = parseInt(query.limit as string, 10);
  const limit = Math.min(isNaN(limitVal) ? 20 : limitVal, maxLimit);
  const offsetVal = parseInt(query.offset as string, 10);
  const offset = isNaN(offsetVal) ? 0 : Math.max(offsetVal, 0);
  return { limit, offset };
}

export function validateUUID(field = 'id') {
  return param(field).isUUID().withMessage(`${field} must be a valid UUID`);
}

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', details: errors.array() }
    });
  }
  next();
}

export function successResponse<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

export function errorResponse(res: Response, message: string, statusCode = 400, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      details
    }
  });
}
