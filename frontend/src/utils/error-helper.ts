/**
 * Safe error extraction for unknown error types.
 * Works with axios errors, fetch errors, and standard Error objects.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    // Axios-style error
    const response = err.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (typeof data?.error === 'string') return data.error;
    if (typeof err.message === 'string') return err.message;
  }
  return String(error);
}

/** Extract axios-style response error data safely */
export function getAxiosErrorData(error: unknown): { error?: string; message?: string } | undefined {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const response = err.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (data) {
      return {
        error: typeof data.error === 'string' ? data.error : undefined,
        message: typeof data.message === 'string' ? data.message : undefined,
      };
    }
  }
  return undefined;
}
