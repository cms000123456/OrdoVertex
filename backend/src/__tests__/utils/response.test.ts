import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/response';

describe('successResponse', () => {
  let res: Partial<Response>;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should return 200 with data by default', () => {
    successResponse(res as Response, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 1 }
    });
  });

  it('should return custom status code', () => {
    successResponse(res as Response, { created: true }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { created: true }
    });
  });

  it('should handle null data', () => {
    successResponse(res as Response, null);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: null
    });
  });
});

describe('errorResponse', () => {
  let res: Partial<Response>;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should return 400 with message by default', () => {
    errorResponse(res as Response, 'Bad request');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Bad request',
        details: undefined
      }
    });
  });

  it('should return custom status code', () => {
    errorResponse(res as Response, 'Not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should include details when provided', () => {
    const details = [{ field: 'email', msg: 'Invalid' }];
    errorResponse(res as Response, 'Validation failed', 400, details);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Validation failed',
        details
      }
    });
  });
});
