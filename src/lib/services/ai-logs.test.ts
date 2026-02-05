import { describe, it, expect, vi, beforeEach } from "vitest";
import { insertAiLog, type AiLogData } from "./ai-logs";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

function mockSupabase(overrides: { insertError?: string } = {}) {
  const chain = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          overrides.insertError
            ? { data: null, error: { message: overrides.insertError } }
            : {
                data: { id: "log-1", action_type: "classify_post" },
                error: null,
              },
        ),
      })),
    })),
  };

  const client = {
    from: vi.fn(() => chain),
  };

  vi.mocked(createAdminClient).mockReturnValue(client as never);
  return { client, chain };
}

const validLogData: AiLogData = {
  userId: "user-1",
  actionType: "classify_post",
  model: "gpt-4o-mini",
  promptTemplate: "classify_post",
  promptVersion: 1,
  contextPayload: { post_id: "post-1", body_preview: "Hello world" },
  fullPrompt: "System: ...\nUser: Hello world",
  response: '{"intent":"educate","content_type":"single","topics":["ai"]}',
  tokensIn: 150,
  tokensOut: 30,
  latencyMs: 420,
  wasUsed: true,
};

describe("insertAiLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a log entry into ai_logs table", async () => {
    const { client, chain } = mockSupabase();

    const result = await insertAiLog(validLogData);

    expect(client.from).toHaveBeenCalledWith("ai_logs");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        action_type: "classify_post",
        model: "gpt-4o-mini",
        prompt_template: "classify_post",
        prompt_version: 1,
        tokens_in: 150,
        tokens_out: 30,
        latency_ms: 420,
        was_used: true,
      }),
    );
    expect(result).toEqual({ id: "log-1", action_type: "classify_post" });
  });

  it("includes context_payload and full_prompt", async () => {
    const { chain } = mockSupabase();

    await insertAiLog(validLogData);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        context_payload: { post_id: "post-1", body_preview: "Hello world" },
        full_prompt: "System: ...\nUser: Hello world",
        response: '{"intent":"educate","content_type":"single","topics":["ai"]}',
      }),
    );
  });

  it("allows optional session_id", async () => {
    const { chain } = mockSupabase();

    await insertAiLog({ ...validLogData, sessionId: "session-abc" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "session-abc",
      }),
    );
  });

  it("defaults session_id to null", async () => {
    const { chain } = mockSupabase();

    await insertAiLog(validLogData);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: null,
      }),
    );
  });

  it("throws on insert error", async () => {
    mockSupabase({ insertError: "Insert failed" });

    await expect(insertAiLog(validLogData)).rejects.toThrow("Insert failed");
  });
});
