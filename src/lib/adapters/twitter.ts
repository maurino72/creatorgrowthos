import type {
  PlatformAdapter,
  TokenPair,
  PlatformUserInfo,
  PostPayload,
  PlatformPostResult,
  RawMetricSnapshot,
} from "./types";

export class TwitterAdapter implements PlatformAdapter {
  getAuthUrl(_state: string, _redirectUri: string): string {
    throw new Error("Not implemented");
  }

  async exchangeCodeForTokens(
    _code: string,
    _redirectUri: string,
  ): Promise<TokenPair> {
    throw new Error("Not implemented");
  }

  async refreshTokens(_refreshToken: string): Promise<TokenPair> {
    throw new Error("Not implemented");
  }

  async getCurrentUser(_accessToken: string): Promise<PlatformUserInfo> {
    throw new Error("Not implemented");
  }

  async publishPost(
    _accessToken: string,
    _payload: PostPayload,
  ): Promise<PlatformPostResult> {
    throw new Error("Not implemented");
  }

  async deletePost(
    _accessToken: string,
    _platformPostId: string,
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async fetchPostMetrics(
    _accessToken: string,
    _platformPostId: string,
  ): Promise<RawMetricSnapshot> {
    throw new Error("Not implemented");
  }
}
