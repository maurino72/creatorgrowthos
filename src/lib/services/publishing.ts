import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapterForPlatform } from "@/lib/adapters";
import {
  getConnectionByPlatform,
  updateTokens,
} from "@/lib/services/connections";
import { decrypt } from "@/lib/utils/encryption";
import { downloadImage, deleteImage } from "@/lib/services/media";
import { formatTagsForPublish } from "@/lib/validators/tags";
import type { PlatformType } from "@/lib/adapters/types";

export function buildPublishText(
  body: string,
  tags: string[],
  charLimit: number,
): string {
  if (tags.length === 0) return body;

  let result = body;
  for (const tag of tags) {
    const suffix = ` #${tag}`;
    if (result.length + suffix.length <= charLimit) {
      result += suffix;
    }
  }
  return result;
}

export interface PublishResult {
  platform: PlatformType;
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

export async function publishPost(
  userId: string,
  postId: string,
): Promise<PublishResult[]> {
  const supabase = createAdminClient();

  // Fetch the post with its publications
  const { data: post, error } = await supabase
    .from("posts")
    .select("*, post_publications(*)")
    .eq("user_id", userId)
    .eq("id", postId)
    .is("deleted_at", null)
    .single();

  if (error && error.code === "PGRST116") throw new Error("Post not found");
  if (error) throw new Error(error.message);
  if (!post) throw new Error("Post not found");

  if (post.status !== "draft" && post.status !== "scheduled" && post.status !== "failed") {
    throw new Error("Post must be in draft, scheduled, or failed status to publish");
  }

  const results: PublishResult[] = [];

  for (const pub of post.post_publications) {
    const platform = pub.platform as PlatformType;
    const result = await publishToPlatform(
      userId,
      post,
      pub,
      platform,
      supabase,
    );
    results.push(result);
  }

  // Determine overall post status
  const allSucceeded = results.every((r) => r.success);
  const allFailed = results.every((r) => !r.success);
  const newStatus = allFailed ? "failed" : "published";

  const postUpdate: Record<string, unknown> = { status: newStatus };
  if (!allFailed) {
    postUpdate.published_at = new Date().toISOString();
  }

  await supabase
    .from("posts")
    .update(postUpdate)
    .eq("id", postId)
    .eq("user_id", userId)
    .select("id")
    .single();

  return results;
}

async function publishToPlatform(
  userId: string,
  post: { body: string; tags?: string[] | null; media_urls?: string[] | null },
  publication: { id: string; platform: string },
  platform: PlatformType,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<PublishResult> {
  // Get connection
  const connection = await getConnectionByPlatform(userId, platform);
  if (!connection) {
    await updatePublication(supabase, publication.id, {
      status: "failed",
      error_message: `No active connection for ${platform}`,
    });
    return {
      platform,
      success: false,
      error: `No active connection for ${platform}`,
    };
  }

  // Decrypt and potentially refresh token
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(connection, platform);
  } catch (err) {
    const message = (err as Error).message;
    await updatePublication(supabase, publication.id, {
      status: "failed",
      error_message: message,
    });
    return { platform, success: false, error: message };
  }

  // Publish via adapter
  try {
    const adapter = getAdapterForPlatform(platform);

    // Upload media if present
    const mediaIds: string[] = [];
    const mediaUrls = post.media_urls ?? [];
    for (const mediaPath of mediaUrls) {
      const buffer = await downloadImage(mediaPath);
      const ext = mediaPath.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
      };
      const mimeType = mimeMap[ext] ?? "image/jpeg";
      const mediaId = await adapter.uploadMedia(accessToken, buffer, mimeType);
      mediaIds.push(mediaId);
    }

    const publishText = buildPublishText(post.body, post.tags ?? [], 280);
    const payload: { text: string; mediaIds?: string[] } = {
      text: publishText,
    };
    if (mediaIds.length > 0) {
      payload.mediaIds = mediaIds;
    }

    const result = await adapter.publishPost(accessToken, payload);

    await updatePublication(supabase, publication.id, {
      status: "published",
      platform_post_id: result.platformPostId,
      platform_url: result.platformUrl,
      published_at: result.publishedAt.toISOString(),
    });

    // Clean up storage after successful publish
    for (const mediaPath of mediaUrls) {
      await deleteImage(mediaPath).catch(() => {});
    }

    return {
      platform,
      success: true,
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
    };
  } catch (err) {
    const message = (err as Error).message;
    await updatePublication(supabase, publication.id, {
      status: "failed",
      error_message: message,
    });
    return { platform, success: false, error: message };
  }
}

async function getValidAccessToken(
  connection: {
    id: string;
    access_token_enc: string | null;
    refresh_token_enc?: string | null;
    token_expires_at?: string | null;
    platform: string;
  },
  platform: PlatformType,
): Promise<string> {
  if (!connection.access_token_enc) {
    throw new Error(`No access token for ${platform}`);
  }

  const isExpired =
    connection.token_expires_at &&
    new Date(connection.token_expires_at) <= new Date();

  if (!isExpired) {
    return decrypt(connection.access_token_enc);
  }

  // Token is expired — try to refresh
  if (!connection.refresh_token_enc) {
    throw new Error(`Token expired and no refresh token for ${platform}`);
  }

  const refreshToken = decrypt(connection.refresh_token_enc);
  const adapter = getAdapterForPlatform(platform);
  const newTokens = await adapter.refreshTokens(refreshToken);

  await updateTokens(connection.id, {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresAt: newTokens.expiresAt,
  });

  return newTokens.accessToken;
}

async function updatePublication(
  supabase: ReturnType<typeof createAdminClient>,
  publicationId: string,
  data: Record<string, unknown>,
) {
  await supabase
    .from("post_publications")
    .update(data)
    .eq("id", publicationId)
    .select("id")
    .single();
}
