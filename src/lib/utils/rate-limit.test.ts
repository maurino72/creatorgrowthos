import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseRateLimitHeaders,
  RateLimitError,
  withRateLimitRetry,
} from "./rate-limit";

describe("parseRateLimitHeaders", () => {
  it("extracts rate limit headers", () => {
    const headers = new Headers({
      "x-rate-limit-remaining": "10",
      "x-rate-limit-reset": "1700000000",
      "retry-after": "30",
    });

    const result = parseRateLimitHeaders(headers);
    expect(result.remaining).toBe(10);
    expect(result.reset).toBe(1700000000);
    expect(result.retryAfter).toBe(30);
  });

  it("returns undefined for missing headers", () => {
    const headers = new Headers();
    const result = parseRateLimitHeaders(headers);
    expect(result.remaining).toBeUndefined();
    expect(result.reset).toBeUndefined();
    expect(result.retryAfter).toBeUndefined();
  });

  it("handles partial headers", () => {
    const headers = new Headers({
      "x-rate-limit-remaining": "5",
    });
    const result = parseRateLimitHeaders(headers);
    expect(result.remaining).toBe(5);
    expect(result.reset).toBeUndefined();
    expect(result.retryAfter).toBeUndefined();
  });
});

describe("RateLimitError", () => {
  it("is an instance of Error", () => {
    const err = new RateLimitError("rate limited", { retryAfter: 30 });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("rate limited");
    expect(err.retryAfter).toBe(30);
  });

  it("stores rate limit info", () => {
    const err = new RateLimitError("hit limit", {
      remaining: 0,
      reset: 1700000000,
      retryAfter: 60,
    });
    expect(err.remaining).toBe(0);
    expect(err.reset).toBe(1700000000);
    expect(err.retryAfter).toBe(60);
  });

  it("has name RateLimitError", () => {
    const err = new RateLimitError("test");
    expect(err.name).toBe("RateLimitError");
  });
});

describe("withRateLimitRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first try if no error", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRateLimitRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on RateLimitError with exponential backoff", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError("rate limited"))
      .mockRejectedValueOnce(new RateLimitError("rate limited"))
      .mockResolvedValue("success");

    const promise = withRateLimitRetry(fn, { maxRetries: 3, baseDelayMs: 100 });

    // First retry: 100ms * 2^0 = 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry: 100ms * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses retryAfter from RateLimitError when available", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError("limited", { retryAfter: 5 }))
      .mockResolvedValue("ok");

    const promise = withRateLimitRetry(fn, { maxRetries: 2, baseDelayMs: 100 });

    // retryAfter = 5 seconds = 5000ms
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries exhausted", async () => {
    vi.useRealTimers();

    const fn = vi.fn().mockRejectedValue(new RateLimitError("limited"));

    await expect(
      withRateLimitRetry(fn, { maxRetries: 2, baseDelayMs: 10 }),
    ).rejects.toThrow("limited");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries

    vi.useFakeTimers();
  });

  it("does not retry non-RateLimitError errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(
      withRateLimitRetry(fn, { maxRetries: 3 }),
    ).rejects.toThrow("network error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses default options when none provided", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRateLimitRetry(fn);
    expect(result).toBe("ok");
  });
});

// Need afterEach at module level for vitest
import { afterEach } from "vitest";
