import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { cleanupOrphanMedia } from "./cleanup-media";
import { createAdminClient } from "@/lib/supabase/admin";

function createMockStep() {
  return {
    run: vi.fn((id: string, fn: () => unknown) => fn()),
  };
}

describe("cleanup-orphan-media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(cleanupOrphanMedia).toBeDefined();
  });

  it("deletes orphan files older than 24 hours", async () => {
    const step = createMockStep();

    const removeMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const storageMock = {
      list: vi.fn()
        .mockResolvedValueOnce({
          data: [{ name: "user-1" }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              name: "orphan.jpg",
              created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            },
          ],
          error: null,
        }),
      remove: removeMock,
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [], // No posts reference anything
        error: null,
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
      storage: { from: vi.fn().mockReturnValue(storageMock) },
    } as unknown as ReturnType<typeof createAdminClient>);

    const handler = cleanupOrphanMedia["fn"];
    const result = await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(removeMock).toHaveBeenCalledWith(["user-1/orphan.jpg"]);
    expect(result).toEqual({ deleted: 1 });
  });

  it("skips files referenced by posts", async () => {
    const step = createMockStep();

    const removeMock = vi.fn();
    const storageMock = {
      list: vi.fn()
        .mockResolvedValueOnce({
          data: [{ name: "user-1" }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              name: "used.jpg",
              created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            },
          ],
          error: null,
        }),
      remove: removeMock,
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [{ media_urls: ["user-1/used.jpg"] }],
        error: null,
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
      storage: { from: vi.fn().mockReturnValue(storageMock) },
    } as unknown as ReturnType<typeof createAdminClient>);

    const handler = cleanupOrphanMedia["fn"];
    const result = await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(removeMock).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: 0 });
  });
});
