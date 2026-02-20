import type {
  AuthResult,
  PlatformAdapter,
  TokenPair,
  PlatformUserInfo,
  PostPayload,
  PlatformPostResult,
  RawMetricSnapshot,
  UploadMediaOptions,
} from "./types";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts";
const LINKEDIN_IMAGES_URL = "https://api.linkedin.com/rest/images";
const LINKEDIN_SOCIAL_METADATA_URL = "https://api.linkedin.com/rest/socialMetadata";
const LINKEDIN_POST_ANALYTICS_URL = "https://api.linkedin.com/rest/memberCreatorPostAnalytics";
const LINKEDIN_VIDEO_ANALYTICS_URL = "https://api.linkedin.com/rest/memberCreatorVideoAnalytics";
const LINKEDIN_FOLLOWERS_URL = "https://api.linkedin.com/rest/memberFollowersCount";
const LINKEDIN_VERSION = "202601";

const POST_METRIC_TYPES = ["IMPRESSION", "MEMBERS_REACHED", "REACTION", "COMMENT", "RESHARE"] as const;
const SCOPES = "openid profile email w_member_social r_member_postAnalytics r_member_profileAnalytics";

const ANALYTICS_SCOPES = ["r_member_postAnalytics", "r_member_profileAnalytics"] as const;

export function hasAnalyticsScopes(scopes: string[] | null | undefined): boolean {
  if (!scopes || scopes.length === 0) return false;
  return ANALYTICS_SCOPES.every((s) => scopes.includes(s));
}

export class AnalyticsScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsScopeError";
  }
}

export class LinkedInAdapter implements PlatformAdapter {
  private get clientId(): string {
    return process.env.LINKEDIN_CLIENT_ID!;
  }

  private get clientSecret(): string {
    return process.env.LINKEDIN_CLIENT_SECRET!;
  }

  private versionHeaders(): Record<string, string> {
    return {
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  getAuthUrl(state: string, redirectUri: string): AuthResult {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });

    return {
      url: `${LINKEDIN_AUTH_URL}?${params.toString()}`,
      codeVerifier: undefined,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    _codeVerifier?: string,
  ): Promise<TokenPair> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Token exchange failed: ${(error as Record<string, string>).error ?? response.statusText}`,
      );
    }

    return this.parseTokenResponse(await response.json());
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Token refresh failed: ${(error as Record<string, string>).error ?? response.statusText}`,
      );
    }

    return this.parseTokenResponse(await response.json());
  }

  async getCurrentUser(accessToken: string): Promise<PlatformUserInfo> {
    const response = await fetch(LINKEDIN_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch current user: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      sub: string;
      name: string;
      email?: string;
      picture?: string;
    };

    return {
      platformUserId: json.sub,
      username: json.name,
      displayName: json.name,
      avatarUrl: json.picture,
    };
  }

  async publishPost(
    accessToken: string,
    payload: PostPayload,
  ): Promise<PlatformPostResult> {
    const author = payload.authorId?.startsWith("urn:")
      ? payload.authorId
      : `urn:li:person:${payload.authorId}`;

    const body: Record<string, unknown> = {
      author,
      commentary: payload.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    if (payload.mediaIds && payload.mediaIds.length > 0) {
      if (payload.mediaIds.length === 1) {
        body.content = {
          media: { id: payload.mediaIds[0] },
        };
      } else {
        body.content = {
          multiImage: {
            images: payload.mediaIds.map((id) => ({ id })),
          },
        };
      }
    }

    const response = await fetch(LINKEDIN_POSTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...this.versionHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).message ?? response.statusText;
      throw new Error(`Publish failed: ${detail}`);
    }

    const postUrn = response.headers.get("x-restli-id") ?? "";

    return {
      platformPostId: postUrn,
      platformUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
      publishedAt: new Date(),
    };
  }

  async uploadMedia(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
    options?: UploadMediaOptions,
  ): Promise<string> {
    // Initialize upload
    const initResponse = await fetch(
      `${LINKEDIN_IMAGES_URL}?action=initializeUpload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...this.versionHeaders(),
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: options?.authorId?.startsWith("urn:")
              ? options.authorId
              : `urn:li:person:${options?.authorId}`,
          },
        }),
      },
    );

    if (!initResponse.ok) {
      throw new Error(`Image upload init failed: ${initResponse.statusText}`);
    }

    const initJson = (await initResponse.json()) as {
      value: {
        uploadUrl: string;
        image: string;
      };
    };

    const { uploadUrl, image: imageUrn } = initJson.value;

    // PUT binary data
    const putResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": mimeType,
      },
      body: new Uint8Array(buffer),
    });

    if (!putResponse.ok) {
      throw new Error(`Image upload PUT failed: ${putResponse.statusText}`);
    }

    return imageUrn;
  }

  async deletePost(
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    const encodedUrn = encodeURIComponent(platformPostId);
    const response = await fetch(`${LINKEDIN_POSTS_URL}/${encodedUrn}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...this.versionHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).message ?? response.statusText;
      throw new Error(`Delete failed: ${detail}`);
    }
  }

  async fetchPostMetrics(
    accessToken: string,
    platformPostId: string,
  ): Promise<RawMetricSnapshot> {
    const encodedUrn = encodeURIComponent(platformPostId);
    const response = await fetch(
      `${LINKEDIN_SOCIAL_METADATA_URL}/${encodedUrn}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...this.versionHeaders(),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).message ?? response.statusText;
      throw new Error(`Fetch metrics failed: ${detail}`);
    }

    const json = (await response.json()) as {
      reactionSummaries?: { reactionType: string; count: number }[];
      commentSummary?: { count: number };
      shareSummary?: { count: number };
    };

    const likeReaction = json.reactionSummaries?.find(
      (r) => r.reactionType === "LIKE",
    );

    return {
      likes: likeReaction?.count ?? 0,
      replies: json.commentSummary?.count ?? 0,
      reposts: json.shareSummary?.count ?? 0,
      impressions: undefined,
      clicks: undefined,
      profileVisits: undefined,
      observedAt: new Date(),
    };
  }

  // ─── Post Analytics (memberCreatorPostAnalytics) ─────────────────────

  async fetchPostAnalytics(
    accessToken: string,
    shareUrn: string,
  ): Promise<{
    impressions: number;
    uniqueReach: number;
    reactions: number;
    comments: number;
    shares: number;
  }> {
    const encodedUrn = encodeURIComponent(shareUrn);
    const results: Record<string, number> = {};

    for (const metricType of POST_METRIC_TYPES) {
      const url = `${LINKEDIN_POST_ANALYTICS_URL}?q=entity&entity=(share:${encodedUrn})&queryType=${metricType}&aggregation=TOTAL`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...this.versionHeaders(),
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new AnalyticsScopeError(
            "LinkedIn analytics scopes not granted. Please reconnect your LinkedIn account.",
          );
        }
        const error = await response.json().catch(() => ({}));
        const detail = (error as Record<string, string>).message ?? response.statusText;
        throw new Error(`Post analytics failed: ${detail}`);
      }

      const json = (await response.json()) as {
        elements: { count: number }[];
      };

      results[metricType] = json.elements?.[0]?.count ?? 0;
    }

    return {
      impressions: results.IMPRESSION ?? 0,
      uniqueReach: results.MEMBERS_REACHED ?? 0,
      reactions: results.REACTION ?? 0,
      comments: results.COMMENT ?? 0,
      shares: results.RESHARE ?? 0,
    };
  }

  async fetchAggregatedAnalytics(
    accessToken: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<{
    impressions: number;
    uniqueReach: number;
    reactions: number;
    comments: number;
    shares: number;
  }> {
    const results: Record<string, number> = {};

    for (const metricType of POST_METRIC_TYPES) {
      let url = `${LINKEDIN_POST_ANALYTICS_URL}?q=me&queryType=${metricType}&aggregation=TOTAL`;

      if (dateRange) {
        const s = dateRange.start;
        const e = dateRange.end;
        url += `&dateRange=(start:(day:${s.getUTCDate()},month:${s.getUTCMonth() + 1},year:${s.getUTCFullYear()}),end:(day:${e.getUTCDate()},month:${e.getUTCMonth() + 1},year:${e.getUTCFullYear()}))`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...this.versionHeaders(),
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new AnalyticsScopeError(
            "LinkedIn analytics scopes not granted. Please reconnect your LinkedIn account.",
          );
        }
        const error = await response.json().catch(() => ({}));
        const detail = (error as Record<string, string>).message ?? response.statusText;
        throw new Error(`Aggregated analytics failed: ${detail}`);
      }

      const json = (await response.json()) as {
        elements: { count: number }[];
      };

      results[metricType] = json.elements?.[0]?.count ?? 0;
    }

    return {
      impressions: results.IMPRESSION ?? 0,
      uniqueReach: results.MEMBERS_REACHED ?? 0,
      reactions: results.REACTION ?? 0,
      comments: results.COMMENT ?? 0,
      shares: results.RESHARE ?? 0,
    };
  }

  // ─── Video Analytics (memberCreatorVideoAnalytics) ─────────────────

  async fetchVideoAnalytics(
    accessToken: string,
    shareUrn: string,
  ): Promise<{
    videoPlays: number;
    videoWatchTimeMs: number;
    videoUniqueViewers: number;
  }> {
    const encodedUrn = encodeURIComponent(shareUrn);
    const videoMetricTypes = ["VIDEO_PLAY", "VIDEO_WATCH_TIME", "VIDEO_VIEWER"] as const;
    const results: Record<string, number> = {};

    for (const metricType of videoMetricTypes) {
      const url = `${LINKEDIN_VIDEO_ANALYTICS_URL}?q=entity&entity=(share:${encodedUrn})&queryType=${metricType}&aggregation=TOTAL`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...this.versionHeaders(),
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new AnalyticsScopeError(
            "LinkedIn analytics scopes not granted. Please reconnect your LinkedIn account.",
          );
        }
        const error = await response.json().catch(() => ({}));
        const detail = (error as Record<string, string>).message ?? response.statusText;
        throw new Error(`Video analytics failed: ${detail}`);
      }

      const json = (await response.json()) as {
        elements: { count: number }[];
      };

      results[metricType] = json.elements?.[0]?.count ?? 0;
    }

    return {
      videoPlays: results.VIDEO_PLAY ?? 0,
      videoWatchTimeMs: results.VIDEO_WATCH_TIME ?? 0,
      videoUniqueViewers: results.VIDEO_VIEWER ?? 0,
    };
  }

  // ─── Follower Statistics (memberFollowersCount) ───────────────────

  async fetchFollowerStats(
    accessToken: string,
  ): Promise<{ followerCount: number }> {
    const response = await fetch(`${LINKEDIN_FOLLOWERS_URL}?q=me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...this.versionHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).message ?? response.statusText;
      throw new Error(`Follower stats failed: ${detail}`);
    }

    const json = (await response.json()) as {
      elements: { memberFollowersCount: number }[];
    };

    return {
      followerCount: json.elements?.[0]?.memberFollowersCount ?? 0,
    };
  }

  async fetchFollowerStatsDaily(
    accessToken: string,
    start: Date,
    end: Date,
  ): Promise<{ newFollowers: number; date: string }[]> {
    const dateRange = `(start:(year:${start.getUTCFullYear()},month:${start.getUTCMonth() + 1},day:${start.getUTCDate()}),end:(year:${end.getUTCFullYear()},month:${end.getUTCMonth() + 1},day:${end.getUTCDate()}))`;

    const response = await fetch(
      `${LINKEDIN_FOLLOWERS_URL}?q=dateRange&dateRange=${dateRange}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...this.versionHeaders(),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).message ?? response.statusText;
      throw new Error(`Follower stats daily failed: ${detail}`);
    }

    const json = (await response.json()) as {
      elements: {
        memberFollowersCount: number;
        dateRange: {
          start: { year: number; month: number; day: number };
          end: { year: number; month: number; day: number };
        };
      }[];
    };

    return (json.elements ?? []).map((el) => ({
      newFollowers: el.memberFollowersCount,
      date: `${el.dateRange.start.year}-${String(el.dateRange.start.month).padStart(2, "0")}-${String(el.dateRange.start.day).padStart(2, "0")}`,
    }));
  }

  private parseTokenResponse(json: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }): TokenPair {
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000)
        : undefined,
      scopes: json.scope?.split(" "),
    };
  }
}
