import type { PlatformType } from "./types";

export const PLATFORM_CHAR_LIMITS: Record<PlatformType, number> = {
  twitter: 280,
  linkedin: 3000,
  threads: 500,
};

const DEFAULT_CHAR_LIMIT = 280;

export function getCharLimitForPlatform(platform: PlatformType): number {
  return PLATFORM_CHAR_LIMITS[platform];
}

export function getCharLimitForPlatforms(platforms: PlatformType[]): number {
  if (platforms.length === 0) return DEFAULT_CHAR_LIMIT;
  return Math.min(...platforms.map((p) => PLATFORM_CHAR_LIMITS[p]));
}
