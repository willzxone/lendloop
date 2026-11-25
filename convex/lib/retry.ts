/** Retry policy for Convex -> n8n notification delivery. */

export const MAX_DELIVERY_ATTEMPTS = 5;
const BASE_DELAY_MS = 15_000;
const MAX_DELAY_MS = 10 * 60_000;

/**
 * Exponential backoff with up to 20% jitter: ~15s, 30s, 60s, 120s.
 * `attempt` is the attempt that just failed (1-based).
 */
export function backoffDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.round(base * (1 + 0.2 * random()));
}

/**
 * 5xx, 408 and 429 are worth retrying. So is 404: n8n answers 404 while the
 * webhook is not registered yet (n8n restarting or the workflow not active).
 * Other 4xx (400, 401, 403) mean the request itself is wrong; resending the
 * same request would fail the same way.
 */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 404 || status === 408 || status === 429;
}
