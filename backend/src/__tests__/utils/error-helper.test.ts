import { getErrorMessage, getErrorStack } from '../../utils/error-helper';

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('should return the string itself for string errors', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('should extract message from object with message property', () => {
    const error = { message: 'object error message' };
    expect(getErrorMessage(error)).toBe('object error message');
  });

  it('should return default message for null', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
  });

  it('should return default message for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
  });

  it('should return default message for number', () => {
    expect(getErrorMessage(42)).toBe('An unknown error occurred');
  });

  it('should return default message for plain object without message', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('An unknown error occurred');
  });

  it('should handle Error subclass (TypeError)', () => {
    const error = new TypeError('type error');
    expect(getErrorMessage(error)).toBe('type error');
  });
});

describe('getErrorStack', () => {
  it('should extract stack from Error instance', () => {
    const error = new Error('stack test');
    expect(getErrorStack(error)).toBe(error.stack);
  });

  it('should return undefined for string error', () => {
    expect(getErrorStack('string error')).toBeUndefined();
  });

  it('should return undefined for null', () => {
    expect(getErrorStack(null)).toBeUndefined();
  });

  it('should return undefined for plain object', () => {
    expect(getErrorStack({ message: 'test' })).toBeUndefined();
  });
});
