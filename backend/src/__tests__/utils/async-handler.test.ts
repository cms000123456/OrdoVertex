import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../utils/async-handler';

describe('asyncHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('should call next with error when async handler rejects', async () => {
    const error = new Error('async failure');
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when async handler resolves', async () => {
    const handler = asyncHandler(async (_req, _res, _next) => {
      // success
    });

    await handler(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('should forward rejected error to next', async () => {
    const handler = asyncHandler(async () => {
      throw new TypeError('type mismatch');
    });

    await handler(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(TypeError));
  });

  it('should work with synchronous-like handlers that return resolved promise', async () => {
    const handler = asyncHandler(async (_req, res) => {
      (res as Response).json({ ok: true });
    });

    res.json = jest.fn();
    await handler(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
