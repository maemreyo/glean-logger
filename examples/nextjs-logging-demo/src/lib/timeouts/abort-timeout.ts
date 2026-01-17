/**
 * Abort controller-based timeout implementation
 */

export interface TimeoutController {
  signal: AbortSignal;
  abort: (reason?: string) => void;
}

/**
 * Create a timeout controller that aborts after the specified duration
 */
export function createTimeoutController(timeoutMs: number): TimeoutController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(`Timeout of ${timeoutMs}ms exceeded`);
  }, timeoutMs);

  return {
    signal: controller.signal,
    abort: (reason?: string) => {
      clearTimeout(timeoutId);
      controller.abort(reason);
    },
  };
}

/**
 * Create a timeout that rejects a promise after the specified duration
 */
export function createTimeoutPromise<T>(
  timeoutMs: number,
  message: string = 'Operation timed out'
): Promise<T> {
  return new Promise((_resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    // Cleanup timeout if promise settles early
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise.resolve().then(() => clearTimeout(timeoutId as any));
  });
}
