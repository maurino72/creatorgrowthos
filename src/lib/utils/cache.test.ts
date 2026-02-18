import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TTLCache } from "./cache";

describe("TTLCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for missing key", () => {
    const cache = new TTLCache<string>(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves a value", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined after TTL expires", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("key", "value");

    vi.advanceTimersByTime(1001);

    expect(cache.get("key")).toBeUndefined();
  });

  it("returns value before TTL expires", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("key", "value");

    vi.advanceTimersByTime(999);

    expect(cache.get("key")).toBe("value");
  });

  it("overwrites existing entry on set", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("key", "old");
    cache.set("key", "new");
    expect(cache.get("key")).toBe("new");
  });

  it("resets TTL on overwrite", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("key", "v1");

    vi.advanceTimersByTime(800);
    cache.set("key", "v2");

    vi.advanceTimersByTime(800);
    expect(cache.get("key")).toBe("v2");
  });

  it("handles multiple keys independently", () => {
    const cache = new TTLCache<number>(1000);
    cache.set("a", 1);

    vi.advanceTimersByTime(500);
    cache.set("b", 2);

    vi.advanceTimersByTime(501);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  it("clear() removes all entries", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("a", "1");
    cache.set("b", "2");

    cache.clear();

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("tracks size correctly", () => {
    const cache = new TTLCache<string>(1000);
    expect(cache.size).toBe(0);

    cache.set("a", "1");
    expect(cache.size).toBe(1);

    cache.set("b", "2");
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("deletes expired entry on get and reduces size", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("key", "value");
    expect(cache.size).toBe(1);

    vi.advanceTimersByTime(1001);

    cache.get("key");
    expect(cache.size).toBe(0);
  });

  it("stores null values", () => {
    const cache = new TTLCache<string | null>(1000);
    cache.set("key", null);
    expect(cache.get("key")).toBeNull();
  });

  it("stores complex objects", () => {
    const cache = new TTLCache<{ data: number[] }>(1000);
    const obj = { data: [1, 2, 3] };
    cache.set("key", obj);
    expect(cache.get("key")).toEqual({ data: [1, 2, 3] });
  });
});
