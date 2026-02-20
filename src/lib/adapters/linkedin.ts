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
const LINKEDIN_VERSION = "202601";
const SCOPES = "openid profile email w_member_social";

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
