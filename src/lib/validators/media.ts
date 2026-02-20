import { z } from "zod";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const VIDEO_MIME_TYPES = ["video/mp4"] as const;

export const GIF_MIME_TYPES = ["image/gif"] as const;

export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (images)
export const MAX_VIDEO_SIZE = 512 * 1024 * 1024; // 512MB
export const MAX_GIF_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_IMAGES_PER_POST = 4;
export const MAX_ALT_TEXT_LENGTH = 1000;
export const MIN_IMAGE_DIMENSION = 100;
export const MAX_IMAGE_DIMENSION = 8192;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface HeaderValidationResult {
  valid: boolean;
  detectedType?: string;
  error?: string;
}

export function validateFileType(mimeType: string): ValidationResult {
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { valid: true };
  }
  return {
    valid: false,
    error: "Unsupported format. Use JPEG, PNG, GIF, or WEBP",
  };
}

export function validateFileSize(size: number): ValidationResult {
  if (size === 0) {
    return { valid: false, error: "File is empty" };
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: "Image must be under 5MB" };
  }
  return { valid: true };
}

export function validateImageDimensions(
  width: number,
  height: number,
): ValidationResult {
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image too small. Minimum ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels`,
    };
  }
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image too large. Maximum ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels`,
    };
  }
  return { valid: true };
}

export function validateFileHeader(bytes: Uint8Array): HeaderValidationResult {
  if (bytes.length < 4) {
    return {
      valid: false,
      error: "File content does not match a supported image format",
    };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { valid: true, detectedType: "image/png" };
  }

  // GIF: 47 49 46 38 (GIF8)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { valid: true, detectedType: "image/gif" };
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, detectedType: "image/webp" };
  }

  return {
    valid: false,
    error: "File content does not match a supported image format",
  };
}

export const mediaUrlsSchema = z.array(z.string().min(1)).max(MAX_IMAGES_PER_POST);

export const altTextSchema = z.string().min(1).max(MAX_ALT_TEXT_LENGTH);

export type MediaCategory = "tweet_image" | "tweet_video" | "tweet_gif";

export function getMediaCategory(mimeType: string): MediaCategory {
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return "tweet_video";
  }
  // Animated GIF detection: GIF mime type can be either static or animated,
  // but for Twitter API purposes we categorize all GIFs as tweet_gif
  if (mimeType === "image/gif") {
    return "tweet_gif";
  }
  return "tweet_image";
}

export function validateVideoSize(size: number): ValidationResult {
  if (size === 0) {
    return { valid: false, error: "File is empty" };
  }
  if (size > MAX_VIDEO_SIZE) {
    return { valid: false, error: "Video must be under 512MB" };
  }
  return { valid: true };
}

export function validateGifSize(size: number): ValidationResult {
  if (size === 0) {
    return { valid: false, error: "File is empty" };
  }
  if (size > MAX_GIF_SIZE) {
    return { valid: false, error: "GIF must be under 15MB" };
  }
  return { valid: true };
}
