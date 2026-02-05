import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/services/classification", () => ({
  getPostsNeedingClassification: vi.fn(),
  classifyPost: vi.fn(),
}));

import {
  getPostsNeedingClassification,
  classifyPost,
} from "@/lib/services/classification";

function makeRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/jobs/classify-posts", {
    method: "POST",
    headers,
  });
}

describe("POST /api/jobs/classify-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  it("returns 401 without CRON_SECRET", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong CRON_SECRET", async () => {
    const res = await POST(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("processes posts needing classification", async () => {
    vi.mocked(getPostsNeedingClassification).mockResolvedValueOnce([
      { id: "post-1", user_id: "user-1", body: "How to build a SaaS" },
      { id: "post-2", user_id: "user-2", body: "What tool do you use?" },
    ] as never);
    vi.mocked(classifyPost)
      .mockResolvedValueOnce({
        intent: "educate",
        content_type: "single",
        topics: ["saas"],
      })
      .mockResolvedValueOnce({
        intent: "engage",
        content_type: "single",
        topics: ["devtools"],
      });

    const res = await POST(makeRequest("test-cron-secret"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.processed).toBe(2);
    expect(json.failed).toBe(0);
    expect(classifyPost).toHaveBeenCalledTimes(2);
  });

  it("handles individual classification failures gracefully", async () => {
    vi.mocked(getPostsNeedingClassification).mockResolvedValueOnce([
      { id: "post-1", user_id: "user-1", body: "Post 1" },
      { id: "post-2", user_id: "user-2", body: "Post 2" },
      { id: "post-3", user_id: "user-3", body: "Post 3" },
    ] as never);
    vi.mocked(classifyPost)
      .mockResolvedValueOnce({ intent: "educate", content_type: "single", topics: ["ai"] })
      .mockRejectedValueOnce(new Error("OpenAI rate limit"))
      .mockResolvedValueOnce({ intent: "engage", content_type: "single", topics: ["marketing"] });

    const res = await POST(makeRequest("test-cron-secret"));
    const json = await res.json();

    expect(json.processed).toBe(3);
    expect(json.failed).toBe(1);
  });

  it("returns 0 processed when no posts need classification", async () => {
    vi.mocked(getPostsNeedingClassification).mockResolvedValueOnce([]);

    const res = await POST(makeRequest("test-cron-secret"));
    const json = await res.json();

    expect(json.processed).toBe(0);
    expect(json.failed).toBe(0);
  });
});
