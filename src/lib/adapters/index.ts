import type { PlatformAdapter, PlatformType } from "./types";
import { TwitterAdapter } from "./twitter";

const adapters: Record<string, () => PlatformAdapter> = {
  twitter: () => new TwitterAdapter(),
};

export function getAdapterForPlatform(platform: PlatformType): PlatformAdapter {
  const factory = adapters[platform];
  if (!factory) {
    throw new Error(`No adapter registered for platform: ${platform}`);
  }
  return factory();
}

export type { PlatformAdapter, PlatformType } from "./types";
export type {
  TokenPair,
  PlatformUserInfo,
  PostPayload,
  PlatformPostResult,
  RawMetricSnapshot,
} from "./types";
