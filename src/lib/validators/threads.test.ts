import { describe, it, expect } from "vitest";
import { threadSchema, splitTextIntoThread } from "./threads";

describe("threadSchema", () => {
  it("accepts valid thread with title and posts", () => {
    const result = threadSchema.safeParse({
      title: "My Thread",
      posts: [{ body: "First tweet" }, { body: "Second tweet" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts thread without title", () => {
    const result = threadSchema.safeParse({
      posts: [{ body: "First tweet" }, { body: "Second tweet" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects thread with fewer than 2 posts", () => {
    const result = threadSchema.safeParse({
      posts: [{ body: "Only one" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects thread with empty post body", () => {
    const result = threadSchema.safeParse({
      posts: [{ body: "" }, { body: "Second" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts posts with media_urls", () => {
    const result = threadSchema.safeParse({
      posts: [
        { body: "First", media_urls: ["path/to/img.jpg"] },
        { body: "Second" },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("splitTextIntoThread", () => {
  it("returns single-item array for text under limit", () => {
    const result = splitTextIntoThread("Short text", 280);
    expect(result).toEqual(["Short text"]);
  });

  it("splits text at sentence boundaries", () => {
    const text = "First sentence. Second sentence. Third sentence.";
    const result = splitTextIntoThread(text, 35);
    expect(result.length).toBeGreaterThan(1);
    // Each part should be under the limit
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(35);
    }
  });

  it("splits at word boundaries when no sentence break fits", () => {
    const text = "word ".repeat(100).trim();
    const result = splitTextIntoThread(text, 30);
    expect(result.length).toBeGreaterThan(1);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(30);
    }
  });

  it("handles text with newlines", () => {
    const text = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";
    const result = splitTextIntoThread(text, 30);
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(30);
    }
  });

  it("returns empty array for empty text", () => {
    const result = splitTextIntoThread("", 280);
    expect(result).toEqual([]);
  });

  it("hard-splits very long words that exceed the limit", () => {
    const text = "A".repeat(300);
    const result = splitTextIntoThread(text, 280);
    expect(result.length).toBe(2);
    expect(result[0].length).toBeLessThanOrEqual(280);
  });
});
