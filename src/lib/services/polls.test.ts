import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPoll, getPollForPost, deletePoll } from "./polls";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

function mockChain(data: unknown = null, error: unknown = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    eq: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

describe("createPoll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a poll record and returns it", async () => {
    const mockPoll = {
      id: "poll-1",
      post_id: "post-1",
      options: ["Yes", "No"],
      duration_minutes: 60,
      created_at: "2024-01-01T00:00:00Z",
    };
    const chain = mockChain(mockPoll);
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await createPoll("post-1", ["Yes", "No"], 60);

    expect(result).toEqual(mockPoll);
    expect(chain.from).toHaveBeenCalledWith("polls");
    expect(chain.insert).toHaveBeenCalledWith({
      post_id: "post-1",
      options: ["Yes", "No"],
      duration_minutes: 60,
    });
  });

  it("throws on insert error", async () => {
    const chain = mockChain(null, { code: "23505", message: "duplicate" });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await expect(createPoll("post-1", ["A", "B"], 60)).rejects.toThrow();
  });
});

describe("getPollForPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns poll for a post", async () => {
    const mockPoll = {
      id: "poll-1",
      post_id: "post-1",
      options: ["Yes", "No"],
      duration_minutes: 60,
    };
    const chain = mockChain(mockPoll);
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await getPollForPost("post-1");

    expect(result).toEqual(mockPoll);
    expect(chain.eq).toHaveBeenCalledWith("post_id", "post-1");
  });

  it("returns null when no poll exists", async () => {
    const chain = mockChain(null);
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await getPollForPost("post-no-poll");

    expect(result).toBeNull();
  });
});

describe("deletePoll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes poll by post_id", async () => {
    const chain = mockChain();
    chain.delete = vi.fn().mockReturnValue({ eq: chain.eq });
    chain.eq.mockResolvedValue({ error: null });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await deletePoll("post-1");

    expect(chain.from).toHaveBeenCalledWith("polls");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("post_id", "post-1");
  });
});
