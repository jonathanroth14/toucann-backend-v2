/**
 * Format API error for display
 */
export function formatApiError(err: unknown): string {
  if (typeof err === 'string') {
    return err;
  }

  if (err instanceof Error) {
    return err.message;
  }

  // Handle FastAPI validation errors
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as any;

    // Single detail string
    if (errorObj.detail && typeof errorObj.detail === 'string') {
      return errorObj.detail;
    }

    // Array of validation errors
    if (errorObj.detail && Array.isArray(errorObj.detail)) {
      return errorObj.detail
        .map((e: any) => {
          if (e.msg) {
            const location = e.loc ? ` (${e.loc.join(' → ')})` : '';
            return `• ${e.msg}${location}`;
          }
          return `• ${JSON.stringify(e)}`;
        })
        .join('\n');
    }

    // Fallback: stringify the object
    return JSON.stringify(err, null, 2);
  }

  return 'An unknown error occurred';
}

/**
 * Log API error in development
 */
export function logApiError(context: string, err: unknown, response?: Response) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`❌ API Error: ${context}`);
    console.error('Error:', err);
    if (response) {
      console.log('Status:', response.status, response.statusText);
    }
    console.groupEnd();
  }
}
