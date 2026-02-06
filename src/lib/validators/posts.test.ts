import { describe, it, expect, vi, afterEach } from "vitest";
import { createPostSchema, updatePostSchema } from "./posts";

describe("createPostSchema", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts valid input with required fields", () => {
    const result = createPostSchema.safeParse({
      body: "Hello world!",
      platforms: ["twitter"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with scheduled_at in the future", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = createPostSchema.safeParse({
      body: "Scheduled post",
      platforms: ["twitter"],
      scheduled_at: future,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = createPostSchema.safeParse({
      body: "",
      platforms: ["twitter"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects body exceeding 280 characters", () => {
    const result = createPostSchema.safeParse({
      body: "a".repeat(281),
      platforms: ["twitter"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts body at exactly 280 characters", () => {
    const result = createPostSchema.safeParse({
      body: "a".repeat(280),
      platforms: ["twitter"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty platforms array", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid platform type", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["instagram"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple valid platforms", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter", "linkedin"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects scheduled_at in the past", () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
      scheduled_at: past,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid scheduled_at format", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
      scheduled_at: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("allows scheduled_at to be omitted", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduled_at).toBeUndefined();
    }
  });

  it("rejects missing body", () => {
    const result = createPostSchema.safeParse({
      platforms: ["twitter"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing platforms", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("accepts media_urls as optional", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.media_urls).toBeUndefined();
    }
  });

  it("accepts valid media_urls array", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
      media_urls: ["user-123/a.jpg", "user-123/b.png"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts up to 4 media_urls", () => {
    const paths = Array.from({ length: 4 }, (_, i) => `user-123/${i}.jpg`);
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
      media_urls: paths,
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 4 media_urls", () => {
    const paths = Array.from({ length: 5 }, (_, i) => `user-123/${i}.jpg`);
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
      media_urls: paths,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty strings in media_urls", () => {
    const result = createPostSchema.safeParse({
      body: "Hello",
      platforms: ["twitter"],
      media_urls: [""],
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePostSchema", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts partial update with just body", () => {
    const result = updatePostSchema.safeParse({
      body: "Updated content",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with just platforms", () => {
    const result = updatePostSchema.safeParse({
      platforms: ["twitter", "threads"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null scheduled_at to clear schedule", () => {
    const result = updatePostSchema.safeParse({
      scheduled_at: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduled_at).toBeNull();
    }
  });

  it("accepts future scheduled_at", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = updatePostSchema.safeParse({
      scheduled_at: future,
    });
    expect(result.success).toBe(true);
  });

  it("rejects body exceeding 280 characters", () => {
    const result = updatePostSchema.safeParse({
      body: "a".repeat(281),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty body when provided", () => {
    const result = updatePostSchema.safeParse({
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty platforms array when provided", () => {
    const result = updatePostSchema.safeParse({
      platforms: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects past scheduled_at", () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const result = updatePostSchema.safeParse({
      scheduled_at: past,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updatePostSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts media_urls update", () => {
    const result = updatePostSchema.safeParse({
      media_urls: ["user-123/updated.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null media_urls to clear images", () => {
    const result = updatePostSchema.safeParse({
      media_urls: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.media_urls).toBeNull();
    }
  });

  it("rejects more than 4 media_urls on update", () => {
    const paths = Array.from({ length: 5 }, (_, i) => `user-123/${i}.jpg`);
    const result = updatePostSchema.safeParse({
      media_urls: paths,
    });
    expect(result.success).toBe(false);
  });
});
