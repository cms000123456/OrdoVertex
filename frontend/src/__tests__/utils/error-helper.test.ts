import { describe, it, expect } from 'vitest';
import { getErrorMessage, getAxiosErrorData } from '../../utils/error-helper';

describe('getErrorMessage', () => {
  it('returns string errors as-is', () => {
    expect(getErrorMessage('plain string')).toBe('plain string');
  });

  it('extracts message from Error objects', () => {
    expect(getErrorMessage(new Error('Something failed'))).toBe('Something failed');
  });

  it('extracts axios response error data', () => {
    const axiosError = {
      response: { data: { error: 'Server rejected request' } },
    };
    expect(getErrorMessage(axiosError)).toBe('Server rejected request');
  });

  it('falls back to message when no response error', () => {
    const err = { message: 'Network timeout' };
    expect(getErrorMessage(err)).toBe('Network timeout');
  });

  it('stringifies arbitrary objects', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('[object Object]');
  });

  it('handles null and undefined', () => {
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('handles numbers', () => {
    expect(getErrorMessage(404)).toBe('404');
  });
});

describe('getAxiosErrorData', () => {
  it('returns undefined for non-objects', () => {
    expect(getAxiosErrorData('string')).toBeUndefined();
    expect(getAxiosErrorData(null)).toBeUndefined();
  });

  it('extracts error and message from axios-style error', () => {
    const err = {
      response: {
        data: {
          error: 'Bad Request',
          message: 'Invalid email format',
        },
      },
    };
    expect(getAxiosErrorData(err)).toEqual({
      error: 'Bad Request',
      message: 'Invalid email format',
    });
  });

  it('returns undefined when no response data', () => {
    expect(getAxiosErrorData(new Error('fail'))).toBeUndefined();
  });

  it('handles partial response data', () => {
    const err = { response: { data: { error: 'Only error' } } };
    expect(getAxiosErrorData(err)).toEqual({
      error: 'Only error',
      message: undefined,
    });
  });
});
