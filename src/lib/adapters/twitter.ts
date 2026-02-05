import { generateCodeVerifier } from "@/lib/utils/pkce";
import type {
  AuthResult,
  PlatformAdapter,
  TokenPair,
  PlatformUserInfo,
  PostPayload,
  PlatformPostResult,
  RawMetricSnapshot,
} from "./types";

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_USER_URL = "https://api.x.com/2/users/me";
const TWITTER_TWEETS_URL = "https://api.x.com/2/tweets";
const SCOPES = "tweet.read tweet.write users.read offline.access";

export class TwitterAdapter implements PlatformAdapter {
  private get clientId(): string {
    return process.env.TWITTER_CLIENT_ID!;
  }

  private get clientSecret(): string {
    return process.env.TWITTER_CLIENT_SECRET!;
  }

  private get basicAuth(): string {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
  }

  getAuthUrl(state: string, redirectUri: string): AuthResult {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallengeSync(codeVerifier);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      url: `${TWITTER_AUTH_URL}?${params.toString()}`,
      codeVerifier,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<TokenPair> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });

    const response = await fetch(TWITTER_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
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
    });

    const response = await fetch(TWITTER_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
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
    const response = await fetch(
      `${TWITTER_USER_URL}?user.fields=profile_image_url`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch current user: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      data: {
        id: string;
        username: string;
        name: string;
        profile_image_url?: string;
      };
    };

    return {
      platformUserId: json.data.id,
      username: json.data.username,
      displayName: json.data.name,
      avatarUrl: json.data.profile_image_url,
    };
  }

  async publishPost(
    accessToken: string,
    payload: PostPayload,
  ): Promise<PlatformPostResult> {
    const body: Record<string, unknown> = { text: payload.text };
    if (payload.replyToId) {
      body.reply = { in_reply_to_tweet_id: payload.replyToId };
    }

    const response = await fetch(TWITTER_TWEETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).detail ?? (error as Record<string, string>).title ?? response.statusText;
      throw new Error(`Publish failed: ${detail}`);
    }

    const json = (await response.json()) as {
      data: { id: string; text: string };
    };

    return {
      platformPostId: json.data.id,
      platformUrl: `https://twitter.com/i/status/${json.data.id}`,
      publishedAt: new Date(),
    };
  }

  async deletePost(
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    const response = await fetch(`${TWITTER_TWEETS_URL}/${platformPostId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).detail ?? (error as Record<string, string>).title ?? response.statusText;
      throw new Error(`Delete failed: ${detail}`);
    }
  }

  async fetchPostMetrics(
    accessToken: string,
    platformPostId: string,
  ): Promise<RawMetricSnapshot> {
    const params = new URLSearchParams({
      "tweet.fields": "public_metrics,non_public_metrics,organic_metrics",
    });

    const response = await fetch(
      `${TWITTER_TWEETS_URL}/${platformPostId}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail =
        (error as Record<string, string>).detail ??
        (error as Record<string, string>).title ??
        response.statusText;
      throw new Error(`Fetch metrics failed: ${detail}`);
    }

    const json = (await response.json()) as {
      data: {
        id: string;
        public_metrics?: {
          impression_count?: number;
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
        };
        non_public_metrics?: {
          url_link_clicks?: number;
          user_profile_clicks?: number;
        };
      };
    };

    const { public_metrics, non_public_metrics } = json.data;

    return {
      impressions: public_metrics?.impression_count,
      likes: public_metrics?.like_count,
      replies: public_metrics?.reply_count,
      reposts: public_metrics?.retweet_count,
      clicks: non_public_metrics?.url_link_clicks,
      profileVisits: non_public_metrics?.user_profile_clicks,
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

/**
 * Synchronous code challenge generation using Node.js crypto.
 * getAuthUrl is synchronous, so we use createHash directly.
 */
function generateCodeChallengeSync(verifier: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("crypto");
  return (createHash("sha256").update(verifier).digest("base64url") as string).replace(
    /=+$/,
    "",
  );
}
