import { Request, Response, NextFunction } from 'express';

describe('rateLimit', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let rateLimitModule: typeof import('../../utils/rate-limit');

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    rateLimitModule = require('../../utils/rate-limit');

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();
    req = { ip: '127.0.0.1' };
    res = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests under the limit', () => {
    const middleware = rateLimitModule.rateLimit({ windowMs: 60000, max: 5 });
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalledWith(429);
  });

  it('should block requests over the limit', () => {
    const middleware = rateLimitModule.rateLimit({ windowMs: 60000, max: 2 });
    
    // 3 requests with same IP
    middleware(req as Request, res as Response, next);
    middleware(req as Request, res as Response, next);
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(statusMock).toHaveBeenCalledWith(429);
  });

  it('should set rate limit headers', () => {
    (req as any).ip = '192.168.1.1';
    const middleware = rateLimitModule.rateLimit({ windowMs: 60000, max: 10 });
    middleware(req as Request, res as Response, next);

    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
  });

  it('should return custom message when limit exceeded', () => {
    const customMessage = 'Custom rate limit message';
    const middleware = rateLimitModule.rateLimit({ windowMs: 60000, max: 1, message: customMessage });
    
    (req as any).ip = '10.0.0.1';
    middleware(req as Request, res as Response, next);
    middleware(req as Request, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: customMessage })
      })
    );
  });

  it('should use different keys for different IPs', () => {
    const middleware = rateLimitModule.rateLimit({ windowMs: 60000, max: 1 });
    
    (req as any).ip = '1.2.3.4';
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Different IP should have its own count
    (req as any).ip = '5.6.7.8';
    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe('authRateLimit', () => {
  it('should return a rate limit middleware', () => {
    jest.resetModules();
    const { authRateLimit } = require('../../utils/rate-limit');
    const middleware = authRateLimit();
    expect(typeof middleware).toBe('function');
  });
});
