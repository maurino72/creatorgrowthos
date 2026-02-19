import type { PlatformAdapter, PlatformType } from "./types";
import { TwitterAdapter } from "./twitter";
import { LinkedInAdapter } from "./linkedin";

const adapters: Record<string, () => PlatformAdapter> = {
  twitter: () => new TwitterAdapter(),
  linkedin: () => new LinkedInAdapter(),
};

export function getAdapterForPlatform(platform: PlatformType): PlatformAdapter {
  const factory = adapters[platform];
  if (!factory) {
    throw new Error(`No adapter registered for platform: ${platform}`);
  }
  return factory();
}

export type { PlatformAdapter, PlatformType, AuthResult } from "./types";
export type {
  TokenPair,
  PlatformUserInfo,
  PostPayload,
  PlatformPostResult,
  RawMetricSnapshot,
  UploadMediaOptions,
} from "./types";
