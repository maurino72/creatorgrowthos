import type { PlatformType } from "@/lib/adapters/types";

export type PlatformSlug = "x" | "linkedin" | "threads";

export const VALID_PLATFORM_SLUGS: PlatformSlug[] = ["x", "linkedin", "threads"];

const SLUG_TO_PLATFORM: Record<PlatformSlug, PlatformType> = {
  x: "twitter",
  linkedin: "linkedin",
  threads: "threads",
};

const PLATFORM_TO_SLUG: Record<PlatformType, PlatformSlug> = {
  twitter: "x",
  linkedin: "linkedin",
  threads: "threads",
};

export function slugToPlatform(slug: string): PlatformType | null {
  return SLUG_TO_PLATFORM[slug as PlatformSlug] ?? null;
}

export function platformToSlug(platform: PlatformType): PlatformSlug {
  return PLATFORM_TO_SLUG[platform];
}

export function isValidPlatformSlug(value: string): value is PlatformSlug {
  return VALID_PLATFORM_SLUGS.includes(value as PlatformSlug);
}
