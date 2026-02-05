import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import {
  getConnectionsForUser,
  getConnectionByPlatform,
  upsertConnection,
  disconnectPlatform,
  updateTokens,
} from "./connections";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    data: null as unknown,
    error: null as unknown,
    ...overrides,
  };

  // Make terminal methods resolve with data/error
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.single.mockImplementation(() =>
    Promise.resolve({ data: chain.data, error: chain.error }),
  );
  chain.delete.mockReturnValue(chain);
  chain.upsert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

const TEST_USER_ID = "user-123";

describe("connections service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConnectionsForUser", () => {
    it("fetches all connections for user and excludes encrypted tokens via select", async () => {
      // The service uses .select() with specific columns that exclude tokens
      const mockConnections = [
        {
          id: "conn-1",
          platform: "twitter",
          platform_user_id: "tw-123",
          platform_username: "testuser",
          status: "active",
          connected_at: "2024-01-01",
          last_synced_at: null,
          token_expires_at: null,
          scopes: ["tweet.read"],
        },
      ];

      const { chain } = mockSupabase();
      chain.select.mockReturnValue(chain);
      chain.eq.mockImplementation(() =>
        Promise.resolve({ data: mockConnections, error: null }),
      );

      const result = await getConnectionsForUser(TEST_USER_ID);

      expect(result).toHaveLength(1);
      // Verify the select was called with specific columns (no token columns)
      expect(chain.select).toHaveBeenCalledWith(
        expect.not.stringContaining("access_token_enc"),
      );
      expect(result[0].platform).toBe("twitter");
      expect(result[0].platform_username).toBe("testuser");
    });

    it("returns empty array when no connections exist", async () => {
      const { chain } = mockSupabase();
      chain.eq.mockImplementation(() =>
        Promise.resolve({ data: [], error: null }),
      );

      const result = await getConnectionsForUser(TEST_USER_ID);
      expect(result).toEqual([]);
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.eq.mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } }),
      );

      await expect(getConnectionsForUser(TEST_USER_ID)).rejects.toThrow(
        "DB error",
      );
    });
  });

  describe("getConnectionByPlatform", () => {
    it("fetches a single connection by platform", async () => {
      const mockConnection = {
        id: "conn-1",
        platform: "twitter",
        platform_username: "testuser",
        status: "active",
      };

      const { chain } = mockSupabase();
      chain.data = mockConnection;
      chain.error = null;

      const result = await getConnectionByPlatform(TEST_USER_ID, "twitter");
      expect(result).toEqual(mockConnection);
    });

    it("returns null when no connection found", async () => {
      const { chain } = mockSupabase();
      chain.data = null;
      chain.error = null;

      const result = await getConnectionByPlatform(TEST_USER_ID, "twitter");
      expect(result).toBeNull();
    });
  });

  describe("upsertConnection", () => {
    it("encrypts tokens before upserting", async () => {
      const { chain } = mockSupabase();
      chain.upsert.mockImplementation(() =>
        Promise.resolve({ data: null, error: null }),
      );

      await upsertConnection(TEST_USER_ID, {
        platform: "twitter",
        platformUserId: "tw-123",
        platformUsername: "testuser",
        accessToken: "access-token-plain",
        refreshToken: "refresh-token-plain",
        expiresAt: new Date("2024-06-01"),
        scopes: ["tweet.read", "tweet.write"],
      });

      expect(encrypt).toHaveBeenCalledWith("access-token-plain");
      expect(encrypt).toHaveBeenCalledWith("refresh-token-plain");

      const upsertCall = chain.upsert.mock.calls[0][0];
      expect(upsertCall.access_token_enc).toBe("encrypted:access-token-plain");
      expect(upsertCall.refresh_token_enc).toBe("encrypted:refresh-token-plain");
      expect(upsertCall.user_id).toBe(TEST_USER_ID);
      expect(upsertCall.platform).toBe("twitter");
      expect(upsertCall.status).toBe("active");
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.upsert.mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "Upsert failed" } }),
      );

      await expect(
        upsertConnection(TEST_USER_ID, {
          platform: "twitter",
          platformUserId: "tw-123",
          platformUsername: "testuser",
          accessToken: "token",
          refreshToken: "refresh",
          expiresAt: new Date(),
          scopes: [],
        }),
      ).rejects.toThrow("Upsert failed");
    });
  });

  describe("disconnectPlatform", () => {
    it("deletes the connection record", async () => {
      const { chain, from } = mockSupabase();
      chain.eq.mockImplementationOnce(() => chain);
      chain.eq.mockImplementation(() =>
        Promise.resolve({ data: null, error: null }),
      );

      await disconnectPlatform(TEST_USER_ID, "twitter");

      expect(from).toHaveBeenCalledWith("platform_connections");
      expect(chain.delete).toHaveBeenCalled();
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.eq.mockImplementationOnce(() => chain);
      chain.eq.mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "Delete failed" } }),
      );

      await expect(
        disconnectPlatform(TEST_USER_ID, "twitter"),
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("updateTokens", () => {
    it("encrypts new tokens and updates the record", async () => {
      const { chain } = mockSupabase();
      chain.eq.mockImplementation(() =>
        Promise.resolve({ data: null, error: null }),
      );

      await updateTokens("conn-1", {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresAt: new Date("2024-12-01"),
      });

      expect(encrypt).toHaveBeenCalledWith("new-access");
      expect(encrypt).toHaveBeenCalledWith("new-refresh");

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.access_token_enc).toBe("encrypted:new-access");
      expect(updateCall.refresh_token_enc).toBe("encrypted:new-refresh");
      expect(updateCall.status).toBe("active");
    });
  });
});
