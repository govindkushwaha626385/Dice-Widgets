/**
 * Runs an async function and retries once after a delay on transient network errors.
 */

const RETRY_DELAY_MS = 3000;

const TRANSIENT_PATTERNS = [
  "ERR_CONNECTION_CLOSED",
  "ERR_NETWORK_CHANGED",
  "ETIMEDOUT",
  "ECONNRESET",
];

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

export async function runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransientError(err)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return fn();
  }
}
