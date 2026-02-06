import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

function mockSupabase(
  userFolders: { name: string; created_at: string }[],
  folderFiles: { name: string; created_at: string }[],
  postMediaUrls: string[][],
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    neq: vi.fn(),
    not: vi.fn(),
  };
  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }

  // The last method in the chain (.not) resolves the promise
  chain.not.mockResolvedValue({
    data: postMediaUrls.map((urls) => ({ media_urls: urls })),
    error: null,
  });

  // Storage mock: first list() returns folders, second list() returns files within a folder
  const listMock = vi.fn()
    .mockResolvedValueOnce({ data: userFolders, error: null })
    .mockResolvedValueOnce({ data: folderFiles, error: null });
  const removeMock = vi.fn().mockResolvedValue({ data: [], error: null });

  const storageMock = {
    from: vi.fn().mockReturnValue({
      list: listMock,
      remove: removeMock,
    }),
  };

  const from = vi.fn().mockReturnValue(chain);

  vi.mocked(createAdminClient).mockReturnValue({
    from,
    storage: storageMock,
  } as never);

  return { from, chain, storageMock, removeMock, listMock };
}

function makeRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/api/jobs/cleanup-media", {
    method: "POST",
    headers,
  });
}

describe("POST /api/jobs/cleanup-media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without CRON_SECRET", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong CRON_SECRET", async () => {
    const res = await POST(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("deletes orphan files older than 24h", async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const userFolders = [{ name: "user-123", created_at: oldDate }];
    const folderFiles = [
      { name: "orphan.jpg", created_at: oldDate },
      { name: "referenced.jpg", created_at: oldDate },
    ];
    // Only referenced.jpg is in a post
    const postMediaUrls = [["user-123/referenced.jpg"]];

    const { removeMock } = mockSupabase(userFolders, folderFiles, postMediaUrls);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.deleted).toBe(1);
    expect(removeMock).toHaveBeenCalledWith(["user-123/orphan.jpg"]);
  });

  it("skips files newer than 24h", async () => {
    const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const userFolders = [{ name: "user-123", created_at: oldDate }];
    const folderFiles = [
      { name: "recent.jpg", created_at: recentDate },
    ];
    const postMediaUrls: string[][] = [];

    const { removeMock } = mockSupabase(userFolders, folderFiles, postMediaUrls);

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();
    expect(body.deleted).toBe(0);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("returns 0 deleted when all files are referenced", async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const userFolders = [{ name: "user-123", created_at: oldDate }];
    const folderFiles = [
      { name: "file1.jpg", created_at: oldDate },
    ];
    const postMediaUrls = [["user-123/file1.jpg"]];

    const { removeMock } = mockSupabase(userFolders, folderFiles, postMediaUrls);

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();
    expect(body.deleted).toBe(0);
    expect(removeMock).not.toHaveBeenCalled();
  });
});
