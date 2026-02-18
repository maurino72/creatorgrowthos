import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyPost,
  updateClassifications,
  getPostsNeedingClassification,
} from "./classification";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual("@/lib/ai/client");
  return { ...actual, chatCompletion: vi.fn() };
});

vi.mock("./ai-logs", () => ({
  insertAiLog: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion } from "@/lib/ai/client";
import { insertAiLog } from "./ai-logs";

function mockChatCompletionResponse(content: string) {
  vi.mocked(chatCompletion).mockResolvedValueOnce({
    content,
    tokensIn: 150,
    tokensOut: 30,
    latencyMs: 50,
    model: "gpt-4o-mini",
  });
}

const validAiResponse = {
  intent: "educate",
  content_type: "single",
  topics: ["ai", "saas"],
  confidence: { intent: 0.92, content_type: 0.88 },
};

function mockSupabaseForClassify(post = {
  id: "post-1",
  user_id: "user-1",
  body: "How to build a SaaS in 2024",
  status: "draft",
  intent: null,
  content_type: null,
  topics: [],
}) {
  const selectSinglePost = vi.fn(() => ({
    data: post,
    error: null,
  }));

  const updateSelectSingle = vi.fn(() => ({
    data: { ...post, intent: "educate", content_type: "single", topics: ["ai", "saas"], ai_assisted: true },
    error: null,
  }));

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => ({ eq: chain.eq }));
  chain.eq = vi.fn((_col: string, _val: string) => {
    // First eq is user_id, second is id, third is deleted_at check
    return { eq: chain.eq, is: chain.is, single: selectSinglePost };
  });
  chain.is = vi.fn(() => ({ single: selectSinglePost }));
  chain.update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: updateSelectSingle,
        })),
      })),
    })),
  }));

  const client = {
    from: vi.fn(() => chain),
  };

  vi.mocked(createAdminClient).mockReturnValue(client as never);
  return { client, chain, selectSinglePost, updateSelectSingle };
}

function mockSupabaseForNeedingClassification(posts: Array<{ id: string; body: string }> = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.is = vi.fn((_col: string, _val: null) => chain);
  chain.neq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => ({
    data: posts,
    error: null,
  }));

  const client = {
    from: vi.fn(() => chain),
  };

  vi.mocked(createAdminClient).mockReturnValue(client as never);
  return { client, chain };
}

describe("classifyPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches post, calls OpenAI, updates post, and logs the call", async () => {
    const { updateSelectSingle } = mockSupabaseForClassify();
    mockChatCompletionResponse(JSON.stringify(validAiResponse));

    const result = await classifyPost("user-1", "post-1");

    expect(result.intent).toBe("educate");
    expect(result.content_type).toBe("single");
    expect(result.topics).toEqual(["ai", "saas"]);
    expect(updateSelectSingle).toHaveBeenCalled();
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        actionType: "classify_post",
        model: "gpt-4o-mini",
        wasUsed: true,
      }),
    );
  });

  it("normalizes topics from AI response", async () => {
    mockSupabaseForClassify();
    mockChatCompletionResponse(JSON.stringify({
      intent: "educate",
      content_type: "single",
      topics: ["Machine Learning", " AI ", "Building in Public"],
    }));

    const result = await classifyPost("user-1", "post-1");
    expect(result.topics).toEqual(["machine-learning", "ai", "building-in-public"]);
  });

  it("throws when post not found", async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.select = vi.fn(() => ({ eq: chain.eq }));
    chain.eq = vi.fn(() => ({ eq: chain.eq, is: chain.is, single: vi.fn(() => ({ data: null, error: { code: "PGRST116", message: "not found" } })) }));
    chain.is = vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: { code: "PGRST116", message: "not found" } })) }));

    const client = { from: vi.fn(() => chain) };
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await expect(classifyPost("user-1", "missing")).rejects.toThrow("Post not found");
  });

  it("throws when OpenAI returns invalid JSON", async () => {
    mockSupabaseForClassify();
    mockChatCompletionResponse("Not valid JSON at all");

    await expect(classifyPost("user-1", "post-1")).rejects.toThrow("classification");
  });

  it("throws when OpenAI returns invalid classification values", async () => {
    mockSupabaseForClassify();
    mockChatCompletionResponse(JSON.stringify({
      intent: "spam",
      content_type: "single",
      topics: ["ai"],
    }));

    await expect(classifyPost("user-1", "post-1")).rejects.toThrow("classification");
  });

  it("logs failed AI call with was_used=false", async () => {
    mockSupabaseForClassify();
    mockChatCompletionResponse("invalid json");

    await classifyPost("user-1", "post-1").catch(() => {});

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        wasUsed: false,
      }),
    );
  });
});

describe("updateClassifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates post with manual classification override", async () => {
    const { updateSelectSingle } = mockSupabaseForClassify();

    const result = await updateClassifications("user-1", "post-1", {
      intent: "promote",
      content_type: "quote",
      topics: ["startup"],
    });

    expect(result).toBeDefined();
    expect(updateSelectSingle).toHaveBeenCalled();
  });

  it("sets ai_assisted to false for manual override", async () => {
    const { chain } = mockSupabaseForClassify();

    await updateClassifications("user-1", "post-1", {
      intent: "engage",
    });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_assisted: false,
        intent: "engage",
      }),
    );
  });

  it("normalizes topics in manual override", async () => {
    const { chain } = mockSupabaseForClassify();

    await updateClassifications("user-1", "post-1", {
      topics: ["Machine Learning", "AI"],
    });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        topics: ["machine-learning", "ai"],
      }),
    );
  });

  it("only updates provided fields", async () => {
    const { chain } = mockSupabaseForClassify();

    await updateClassifications("user-1", "post-1", {
      intent: "curate",
    });

    const updateArg = chain.update.mock.calls[0][0];
    expect(updateArg).toHaveProperty("intent", "curate");
    expect(updateArg).not.toHaveProperty("content_type");
    expect(updateArg).not.toHaveProperty("topics");
  });
});

describe("getPostsNeedingClassification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries posts where intent is null", async () => {
    const posts = [
      { id: "post-1", body: "Hello" },
      { id: "post-2", body: "World" },
    ];
    const { client, chain } = mockSupabaseForNeedingClassification(posts);

    const result = await getPostsNeedingClassification(20);

    expect(client.from).toHaveBeenCalledWith("posts");
    expect(chain.is).toHaveBeenCalledWith("intent", null);
    expect(chain.neq).toHaveBeenCalledWith("status", "deleted");
    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no posts need classification", async () => {
    mockSupabaseForNeedingClassification([]);

    const result = await getPostsNeedingClassification(20);
    expect(result).toEqual([]);
  });
});
