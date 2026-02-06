import { describe, it, expect, vi, beforeEach } from "vitest";
import { importTwitterPosts } from "./import";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/adapters/twitter", () => ({
  TwitterAdapter: vi.fn().mockImplementation(() => ({
    fetchUserTweets: vi.fn(),
  })),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((v: string) => `decrypted-${v}`),
}));

vi.mock("@/lib/inngest/send", () => ({
  sendPostImported: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { TwitterAdapter } from "@/lib/adapters/twitter";
import { sendPostImported } from "@/lib/inngest/send";

const userId = "user-123";
const connectionId = "conn-1";

function mockConnection() {
  return {
    id: connectionId,
    platform_user_id: "twitter-user-1",
    access_token_enc: "enc-token",
    refresh_token_enc: "enc-refresh",
    status: "active",
  };
}

function mockTweet(id: string, text: string) {
  return {
    id,
    text,
    created_at: "2024-01-15T10:00:00.000Z",
    public_metrics: {
      impression_count: 100,
      like_count: 5,
      reply_count: 1,
      retweet_count: 2,
    },
  };
}

function setupMockSupabase(options: {
  connection?: ReturnType<typeof mockConnection> | null;
  insertPostResult?: { data: { id: string }[]; error: null } | { data: null; error: { message: string } };
  insertPublicationResult?: { data: { id: string }[]; error: null } | { data: null; error: { message: string } };
  insertMetricResult?: { error: null } | { error: { message: string } };
  insertImportResult?: { data: { id: string }; error: null } | { data: null; error: { message: string } };
  updateImportResult?: { error: null } | { error: { message: string } };
}) {
  const conn = "connection" in options ? options.connection : mockConnection();

  const fromMap: Record<string, unknown> = {
    platform_connections: {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: conn,
              error: conn ? null : { code: "PGRST116", message: "No active Twitter connection" },
            }),
          }),
        }),
      }),
    },
    posts: {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(
          options.insertPostResult ?? {
            data: [{ id: "post-1" }, { id: "post-2" }],
            error: null,
          },
        ),
      }),
    },
    post_publications: {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(
          options.insertPublicationResult ?? {
            data: [{ id: "pub-1" }, { id: "pub-2" }],
            error: null,
          },
        ),
      }),
    },
    metric_events: {
      insert: vi.fn().mockResolvedValue(
        options.insertMetricResult ?? { error: null },
      ),
    },
    content_imports: {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(
            options.insertImportResult ?? {
              data: { id: "import-1" },
              error: null,
            },
          ),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(
          options.updateImportResult ?? { error: null },
        ),
      }),
    },
  };

  const client = {
    from: vi.fn((table: string) => fromMap[table]),
  };

  vi.mocked(createAdminClient).mockReturnValue(client as never);
  return client;
}

describe("importTwitterPosts", () => {
  let mockAdapter: { fetchUserTweets: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter = {
      fetchUserTweets: vi
        .fn()
        .mockResolvedValue({
          tweets: [mockTweet("tw-1", "Hello"), mockTweet("tw-2", "World")],
        }),
    };
    vi.mocked(TwitterAdapter).mockImplementation(() => mockAdapter as never);
  });

  it("imports tweets and returns summary", async () => {
    setupMockSupabase({});

    const result = await importTwitterPosts(userId, 50);

    expect(result.imported_count).toBe(2);
    expect(result.failed_count).toBe(0);
    expect(mockAdapter.fetchUserTweets).toHaveBeenCalledWith(
      "decrypted-enc-token",
      "twitter-user-1",
      50,
    );
  });

  it("fires post/imported Inngest event", async () => {
    setupMockSupabase({});

    await importTwitterPosts(userId, 50);

    expect(sendPostImported).toHaveBeenCalledWith(
      userId,
      expect.any(Array),
      2,
    );
  });

  it("throws when no Twitter connection exists", async () => {
    setupMockSupabase({ connection: null });

    await expect(importTwitterPosts(userId, 50)).rejects.toThrow(
      "No active Twitter connection",
    );
  });

  it("returns 0 imported when user has no tweets", async () => {
    mockAdapter.fetchUserTweets.mockResolvedValue({ tweets: [] });
    setupMockSupabase({});

    const result = await importTwitterPosts(userId, 50);
    expect(result.imported_count).toBe(0);
  });

  it("creates post records with published status", async () => {
    const client = setupMockSupabase({});

    await importTwitterPosts(userId, 50);

    const postsFrom = client.from("posts") as { insert: ReturnType<typeof vi.fn> };
    expect(postsFrom.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: userId,
          body: "Hello",
          status: "published",
          published_at: "2024-01-15T10:00:00.000Z",
          ai_assisted: false,
        }),
      ]),
    );
  });

  it("creates post_publication records", async () => {
    const client = setupMockSupabase({});

    await importTwitterPosts(userId, 50);

    const pubsFrom = client.from("post_publications") as { insert: ReturnType<typeof vi.fn>; };
    expect(pubsFrom.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: userId,
          platform: "twitter",
          platform_post_id: "tw-1",
          status: "published",
        }),
      ]),
    );
  });

  it("creates metric_events for each imported tweet", async () => {
    const client = setupMockSupabase({});

    await importTwitterPosts(userId, 50);

    const metricsFrom = client.from("metric_events") as { insert: ReturnType<typeof vi.fn> };
    expect(metricsFrom.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          post_publication_id: "pub-1",
          user_id: userId,
          platform: "twitter",
          impressions: 100,
          likes: 5,
        }),
      ]),
    );
  });

  it("creates a content_imports tracking record", async () => {
    const client = setupMockSupabase({});

    await importTwitterPosts(userId, 50);

    const importsFrom = client.from("content_imports") as { insert: ReturnType<typeof vi.fn> };
    expect(importsFrom.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        platform: "twitter",
        requested_count: 50,
        status: "pending",
      }),
    );
  });
});
