/**
 * Rate limit handling utilities for Twitter API calls.
 * Parses rate limit headers and provides exponential backoff retry logic.
 */

export interface RateLimitInfo {
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export class RateLimitError extends Error {
  readonly name = "RateLimitError";
  readonly remaining?: number;
  readonly reset?: number;
  readonly retryAfter?: number;

  constructor(message: string, info?: RateLimitInfo) {
    super(message);
    this.remaining = info?.remaining;
    this.reset = info?.reset;
    this.retryAfter = info?.retryAfter;
  }
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const remaining = headers.get("x-rate-limit-remaining");
  const reset = headers.get("x-rate-limit-reset");
  const retryAfter = headers.get("retry-after");

  return {
    remaining: remaining ? parseInt(remaining, 10) : undefined,
    reset: reset ? parseInt(reset, 10) : undefined,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
  };
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: RateLimitError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof RateLimitError)) {
        throw error;
      }

      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Use retryAfter header if available, otherwise exponential backoff
      const delayMs = error.retryAfter
        ? error.retryAfter * 1000
        : baseDelayMs * Math.pow(2, attempt);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}
