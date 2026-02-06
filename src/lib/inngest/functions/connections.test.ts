import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  updateTokens: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

import { checkExpiringTokens, refreshToken } from "./connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapterForPlatform } from "@/lib/adapters";
import { updateTokens } from "@/lib/services/connections";
import { decrypt } from "@/lib/utils/encryption";

function createMockStep() {
  return {
    run: vi.fn((id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(),
  };
}

describe("check-expiring-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(checkExpiringTokens).toBeDefined();
  });

  it("queries for expiring connections and sends events", async () => {
    const step = createMockStep();

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min from now
    const chain = {
      select: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: "conn-1",
            user_id: "user-1",
            platform: "twitter",
            token_expires_at: expiresAt,
          },
        ],
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createAdminClient>);

    const handler = checkExpiringTokens["fn"];
    await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("find-expiring-tokens", expect.any(Function));
    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-expiring-events",
      expect.arrayContaining([
        expect.objectContaining({
          name: "connection/expiring",
          data: expect.objectContaining({
            userId: "user-1",
            platform: "twitter",
            connectionId: "conn-1",
          }),
        }),
      ]),
    );
  });

  it("does nothing when no tokens are expiring", async () => {
    const step = createMockStep();

    const chain = {
      select: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createAdminClient>);

    const handler = checkExpiringTokens["fn"];
    const result = await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ expiring: 0 });
  });
});

describe("refresh-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(refreshToken).toBeDefined();
  });

  it("refreshes token and sends refreshed event", async () => {
    const step = createMockStep();
    const event = {
      name: "connection/expiring" as const,
      data: {
        userId: "user-1",
        platform: "twitter",
        connectionId: "conn-1",
        expiresAt: "2025-06-01T12:00:00Z",
      },
    };

    // Mock getting the connection
    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "get-connection") {
        return {
          id: "conn-1",
          refresh_token_enc: "encrypted:refresh-token-123",
          platform: "twitter",
        };
      }
      return fn();
    });

    const mockAdapter = {
      refreshTokens: vi.fn().mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date("2025-07-01"),
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(
      mockAdapter as unknown as ReturnType<typeof getAdapterForPlatform>,
    );

    const handler = refreshToken["fn"];
    await handler({ event, step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("get-connection", expect.any(Function));
    expect(step.run).toHaveBeenCalledWith("refresh-tokens", expect.any(Function));
    expect(step.run).toHaveBeenCalledWith("update-tokens", expect.any(Function));

    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-refreshed",
      expect.objectContaining({
        name: "connection/refreshed",
        data: expect.objectContaining({
          userId: "user-1",
          platform: "twitter",
          connectionId: "conn-1",
        }),
      }),
    );
  });

  it("throws when connection has no refresh token", async () => {
    const step = createMockStep();
    const event = {
      name: "connection/expiring" as const,
      data: {
        userId: "user-1",
        platform: "twitter",
        connectionId: "conn-1",
        expiresAt: "2025-06-01T12:00:00Z",
      },
    };

    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "get-connection") {
        return {
          id: "conn-1",
          refresh_token_enc: null,
          platform: "twitter",
        };
      }
      return fn();
    });

    const handler = refreshToken["fn"];
    await expect(
      handler({ event, step } as unknown as Parameters<typeof handler>[0]),
    ).rejects.toThrow("No refresh token");
  });
});
