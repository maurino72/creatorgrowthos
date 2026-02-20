export type PlatformType = "twitter" | "linkedin" | "threads";

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface PlatformUserInfo {
  platformUserId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface PollPayload {
  options: string[];
  durationMinutes: number;
}

export interface PostPayload {
  text: string;
  mediaUrls?: string[];
  mediaIds?: string[];
  replyToId?: string;
  authorId?: string;
  poll?: PollPayload;
  quoteTweetId?: string;
  replySettings?: "everyone" | "mentioned_users" | "following" | "subscribers" | "verified_users";
  placeId?: string;
  communityId?: string;
  mediaAltTexts?: Record<string, string>;
}

export interface UploadMediaOptions {
  authorId?: string;
}

export interface PlatformPostResult {
  platformPostId: string;
  platformUrl: string;
  publishedAt: Date;
}

export interface RawMetricSnapshot {
  impressions?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  clicks?: number;
  profileVisits?: number;
  followsFromPost?: number;
  observedAt: Date;
}

export interface AuthResult {
  url: string;
  codeVerifier?: string;
}

export interface PlatformAdapter {
  getAuthUrl(state: string, redirectUri: string): AuthResult;
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<TokenPair>;
  refreshTokens(refreshToken: string): Promise<TokenPair>;
  getCurrentUser(accessToken: string): Promise<PlatformUserInfo>;
  publishPost(
    accessToken: string,
    payload: PostPayload,
  ): Promise<PlatformPostResult>;
  uploadMedia(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
    options?: UploadMediaOptions,
  ): Promise<string>;
  uploadVideo?(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
    options?: UploadMediaOptions,
  ): Promise<string>;
  uploadGif?(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
    options?: UploadMediaOptions,
  ): Promise<string>;
  deletePost(accessToken: string, platformPostId: string): Promise<void>;
  fetchPostMetrics(
    accessToken: string,
    platformPostId: string,
  ): Promise<RawMetricSnapshot>;
}
