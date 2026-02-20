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

export interface TweetData {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    impression_count: number;
    like_count: number;
    reply_count: number;
    retweet_count: number;
  };
}

export interface FetchUserTweetsResult {
  tweets: TweetData[];
}

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_USER_URL = "https://api.x.com/2/users/me";
const TWITTER_TWEETS_URL = "https://api.x.com/2/tweets";
const TWITTER_UPLOAD_V2_URL = "https://api.x.com/2/media/upload";
const TWITTER_MEDIA_METADATA_URL = "https://api.x.com/2/media/metadata";
const SCOPES = "tweet.read tweet.write users.read offline.access media.write";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PROCESSING_WAIT_MS = 10 * 60 * 1000; // 10 minutes

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
    if (payload.mediaIds && payload.mediaIds.length > 0) {
      body.media = { media_ids: payload.mediaIds };
    }
    if (payload.poll) {
      body.poll = {
        options: payload.poll.options,
        duration_minutes: payload.poll.durationMinutes,
      };
    }
    if (payload.replySettings) {
      body.reply_settings = payload.replySettings;
    }
    if (payload.quoteTweetId) {
      body.quote_tweet_id = payload.quoteTweetId;
    }
    if (payload.placeId) {
      body.geo = { place_id: payload.placeId };
    }
    if (payload.communityId) {
      body.community_id = payload.communityId;
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

  async uploadMedia(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    return this.uploadMediaV2(accessToken, buffer, mimeType, "tweet_image");
  }

  async uploadVideo(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    return this.uploadMediaV2(accessToken, buffer, mimeType, "tweet_video");
  }

  async uploadGif(
    accessToken: string,
    buffer: Buffer,
  ): Promise<string> {
    return this.uploadMediaV2(accessToken, buffer, "image/gif", "tweet_gif");
  }

  async repost(
    accessToken: string,
    userId: string,
    tweetId: string,
  ): Promise<void> {
    const response = await fetch(
      `https://api.x.com/2/users/${userId}/retweets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweet_id: tweetId }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).detail ?? response.statusText;
      throw new Error(`Repost failed: ${detail}`);
    }
  }

  async unrepost(
    accessToken: string,
    userId: string,
    tweetId: string,
  ): Promise<void> {
    const response = await fetch(
      `https://api.x.com/2/users/${userId}/retweets/${tweetId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).detail ?? response.statusText;
      throw new Error(`Unrepost failed: ${detail}`);
    }
  }

  async editPost(
    accessToken: string,
    previousTweetId: string,
    payload: { text: string; mediaIds?: string[] },
  ): Promise<PlatformPostResult> {
    const body: Record<string, unknown> = {
      text: payload.text,
      edit_options: { previous_tweet_id: previousTweetId },
    };
    if (payload.mediaIds && payload.mediaIds.length > 0) {
      body.media = { media_ids: payload.mediaIds };
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
      const detail = (error as Record<string, string>).detail ?? response.statusText;
      throw new Error(`Edit failed: ${detail}`);
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

  async setMediaAltText(
    accessToken: string,
    mediaId: string,
    altText: string,
  ): Promise<void> {
    const response = await fetch(TWITTER_MEDIA_METADATA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ media_id: mediaId, alt_text: altText }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as Record<string, string>).detail ?? response.statusText;
      throw new Error(`Set alt text failed: ${detail}`);
    }
  }

  private async uploadMediaV2(
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
    mediaCategory: string,
  ): Promise<string> {
    // INIT
    const initResponse = await fetch(`${TWITTER_UPLOAD_V2_URL}/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        media_type: mimeType,
        total_bytes: buffer.length,
        media_category: mediaCategory,
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`Media INIT failed: ${initResponse.statusText}`);
    }

    const initJson = (await initResponse.json()) as { id: string };
    const mediaId = initJson.id;

    // APPEND — chunk into CHUNK_SIZE segments
    const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, buffer.length);
      const chunk = buffer.subarray(start, end);

      const appendForm = new FormData();
      appendForm.append("media_data", chunk.toString("base64"));

      const appendResponse = await fetch(
        `${TWITTER_UPLOAD_V2_URL}/${mediaId}/append`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: appendForm,
        },
      );

      if (!appendResponse.ok && appendResponse.status !== 204) {
        throw new Error(`Media APPEND failed: ${appendResponse.statusText}`);
      }
    }

    // FINALIZE
    const finalizeResponse = await fetch(
      `${TWITTER_UPLOAD_V2_URL}/${mediaId}/finalize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!finalizeResponse.ok) {
      throw new Error(`Media FINALIZE failed: ${finalizeResponse.statusText}`);
    }

    const finalizeJson = (await finalizeResponse.json()) as {
      id: string;
      processing_info?: {
        state: string;
        check_after_secs?: number;
        error?: { message: string };
      };
    };

    // Poll for processing completion if needed
    if (finalizeJson.processing_info) {
      await this.waitForProcessing(accessToken, mediaId);
    }

    return mediaId;
  }

  private async waitForProcessing(
    accessToken: string,
    mediaId: string,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_PROCESSING_WAIT_MS) {
      const statusResponse = await fetch(
        `${TWITTER_UPLOAD_V2_URL}?id=${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!statusResponse.ok) {
        throw new Error(`Media STATUS check failed: ${statusResponse.statusText}`);
      }

      const statusJson = (await statusResponse.json()) as {
        id: string;
        processing_info?: {
          state: string;
          check_after_secs?: number;
          progress_percent?: number;
          error?: { message: string };
        };
      };

      const info = statusJson.processing_info;
      if (!info || info.state === "succeeded") {
        return;
      }

      if (info.state === "failed") {
        throw new Error(
          `Media processing failed: ${info.error?.message ?? "Unknown error"}`,
        );
      }

      const waitSecs = info.check_after_secs ?? 5;
      await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));
    }

    throw new Error("Media processing timeout");
  }

  async fetchUserTweets(
    accessToken: string,
    platformUserId: string,
    maxCount: number,
  ): Promise<FetchUserTweetsResult> {
    const allTweets: TweetData[] = [];
    let paginationToken: string | undefined;

    while (allTweets.length < maxCount) {
      const params = new URLSearchParams({
        max_results: String(Math.min(100, maxCount - allTweets.length)),
        "tweet.fields": "created_at,public_metrics,entities",
      });
      if (paginationToken) {
        params.set("pagination_token", paginationToken);
      }

      const response = await fetch(
        `https://api.x.com/2/users/${platformUserId}/tweets?${params.toString()}`,
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
        throw new Error(`Fetch user tweets failed: ${detail}`);
      }

      const json = (await response.json()) as {
        data?: TweetData[];
        meta: { result_count: number; next_token?: string };
      };

      if (json.data) {
        allTweets.push(...json.data);
      }

      if (!json.meta.next_token || allTweets.length >= maxCount) {
        break;
      }
      paginationToken = json.meta.next_token;
    }

    return { tweets: allTweets.slice(0, maxCount) };
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
