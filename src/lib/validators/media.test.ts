import { describe, it, expect } from "vitest";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_POST,
  MIN_IMAGE_DIMENSION,
  MAX_IMAGE_DIMENSION,
  validateFileType,
  validateFileSize,
  validateImageDimensions,
  validateFileHeader,
  mediaUrlsSchema,
} from "./media";

describe("media validation constants", () => {
  it("allows JPEG, PNG, GIF, WEBP", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_MIME_TYPES).toContain("image/gif");
    expect(ALLOWED_MIME_TYPES).toContain("image/webp");
  });

  it("max file size is 5MB", () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it("max images per post is 4", () => {
    expect(MAX_IMAGES_PER_POST).toBe(4);
  });

  it("min dimension is 100", () => {
    expect(MIN_IMAGE_DIMENSION).toBe(100);
  });

  it("max dimension is 8192", () => {
    expect(MAX_IMAGE_DIMENSION).toBe(8192);
  });
});

describe("validateFileType", () => {
  it("accepts image/jpeg", () => {
    expect(validateFileType("image/jpeg")).toEqual({ valid: true });
  });

  it("accepts image/png", () => {
    expect(validateFileType("image/png")).toEqual({ valid: true });
  });

  it("accepts image/gif", () => {
    expect(validateFileType("image/gif")).toEqual({ valid: true });
  });

  it("accepts image/webp", () => {
    expect(validateFileType("image/webp")).toEqual({ valid: true });
  });

  it("rejects image/svg+xml", () => {
    const result = validateFileType("image/svg+xml");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Unsupported format. Use JPEG, PNG, GIF, or WEBP",
    );
  });

  it("rejects application/pdf", () => {
    const result = validateFileType("application/pdf");
    expect(result.valid).toBe(false);
  });

  it("rejects empty string", () => {
    const result = validateFileType("");
    expect(result.valid).toBe(false);
  });
});

describe("validateFileSize", () => {
  it("accepts file under 5MB", () => {
    expect(validateFileSize(1024)).toEqual({ valid: true });
  });

  it("accepts file exactly 5MB", () => {
    expect(validateFileSize(5 * 1024 * 1024)).toEqual({ valid: true });
  });

  it("rejects file over 5MB", () => {
    const result = validateFileSize(5 * 1024 * 1024 + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image must be under 5MB");
  });

  it("rejects zero-byte file", () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("File is empty");
  });
});

describe("validateImageDimensions", () => {
  it("accepts valid dimensions", () => {
    expect(validateImageDimensions(800, 600)).toEqual({ valid: true });
  });

  it("accepts minimum dimensions", () => {
    expect(validateImageDimensions(100, 100)).toEqual({ valid: true });
  });

  it("accepts maximum dimensions", () => {
    expect(validateImageDimensions(8192, 8192)).toEqual({ valid: true });
  });

  it("rejects width below minimum", () => {
    const result = validateImageDimensions(99, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image too small. Minimum 100x100 pixels");
  });

  it("rejects height below minimum", () => {
    const result = validateImageDimensions(100, 99);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image too small. Minimum 100x100 pixels");
  });

  it("rejects width above maximum", () => {
    const result = validateImageDimensions(8193, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image too large. Maximum 8192x8192 pixels");
  });

  it("rejects height above maximum", () => {
    const result = validateImageDimensions(100, 8193);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Image too large. Maximum 8192x8192 pixels");
  });
});

describe("validateFileHeader", () => {
  it("validates JPEG header (FF D8 FF)", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(validateFileHeader(jpeg)).toEqual({
      valid: true,
      detectedType: "image/jpeg",
    });
  });

  it("validates PNG header (89 50 4E 47)", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateFileHeader(png)).toEqual({
      valid: true,
      detectedType: "image/png",
    });
  });

  it("validates GIF header (GIF87a or GIF89a)", () => {
    // GIF89a
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(validateFileHeader(gif)).toEqual({
      valid: true,
      detectedType: "image/gif",
    });
  });

  it("validates WEBP header (RIFF...WEBP)", () => {
    // RIFF????WEBP
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size (placeholder)
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    expect(validateFileHeader(webp)).toEqual({
      valid: true,
      detectedType: "image/webp",
    });
  });

  it("rejects unknown file header", () => {
    const unknown = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const result = validateFileHeader(unknown);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "File content does not match a supported image format",
    );
  });

  it("rejects empty buffer", () => {
    const empty = new Uint8Array(0);
    const result = validateFileHeader(empty);
    expect(result.valid).toBe(false);
  });
});

describe("mediaUrlsSchema", () => {
  it("accepts empty array", () => {
    expect(mediaUrlsSchema.parse([])).toEqual([]);
  });

  it("accepts array of storage paths", () => {
    const paths = ["user-123/img1.jpg", "user-123/img2.png"];
    expect(mediaUrlsSchema.parse(paths)).toEqual(paths);
  });

  it("accepts full URLs", () => {
    const urls = ["https://example.com/a.jpg", "https://example.com/b.png"];
    expect(mediaUrlsSchema.parse(urls)).toEqual(urls);
  });

  it("accepts exactly 4 paths", () => {
    const paths = Array.from({ length: 4 }, (_, i) => `user-123/${i}.jpg`);
    expect(mediaUrlsSchema.parse(paths)).toEqual(paths);
  });

  it("rejects more than 4 paths", () => {
    const paths = Array.from({ length: 5 }, (_, i) => `user-123/${i}.jpg`);
    expect(() => mediaUrlsSchema.parse(paths)).toThrow();
  });

  it("rejects empty strings", () => {
    expect(() => mediaUrlsSchema.parse([""])).toThrow();
  });
});
