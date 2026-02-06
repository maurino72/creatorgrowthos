import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOnboardingState,
  saveQuickProfile,
  updateOnboardingStep,
  completeOnboarding,
  getCreatorProfile,
} from "./profiles";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);

  if (overrides.single) {
    chain.single = overrides.single;
  }

  const client = {
    from: vi.fn().mockReturnValue(chain),
  };

  vi.mocked(createAdminClient).mockReturnValue(client as never);
  return { client, chain };
}

const userId = "user-123";

describe("profiles service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOnboardingState", () => {
    it("returns onboarding state for a user", async () => {
      const { chain } = mockSupabase({
        single: vi.fn().mockResolvedValue({
          data: {
            onboarded_at: null,
            onboarding_step: "connect",
          },
          error: null,
        }),
      });

      const result = await getOnboardingState(userId);
      expect(result).toEqual({
        onboarded_at: null,
        onboarding_step: "connect",
      });
      expect(chain.select).toHaveBeenCalledWith(
        "onboarded_at, onboarding_step",
      );
    });

    it("throws on error", async () => {
      mockSupabase({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      });

      await expect(getOnboardingState(userId)).rejects.toThrow("Not found");
    });
  });

  describe("updateOnboardingStep", () => {
    it("updates the onboarding step", async () => {
      const { client, chain } = mockSupabase({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // For update().eq().single() pattern, we need the update to return the chain
      // but the result should come from the final call
      const updateChain = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateChain),
      });

      await updateOnboardingStep(userId, "profile");

      expect(client.from).toHaveBeenCalledWith("profiles");
    });

    it("throws on error", async () => {
      const { client } = mockSupabase();
      const updateChain = {
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({
              data: null,
              error: { message: "Update failed" },
            }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateChain),
      });

      await expect(updateOnboardingStep(userId, "profile")).rejects.toThrow(
        "Update failed",
      );
    });
  });

  describe("saveQuickProfile", () => {
    it("upserts creator profile data", async () => {
      const { client } = mockSupabase();

      const upsertChain = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "cp-1",
              user_id: userId,
              primary_niche: "tech_software",
              primary_goal: "build_authority",
              target_audience: "SaaS founders",
            },
            error: null,
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue(upsertChain),
      });

      const result = await saveQuickProfile(userId, {
        primary_niche: "tech_software",
        primary_goal: "build_authority",
        target_audience: "SaaS founders",
      });

      expect(result.primary_niche).toBe("tech_software");
      expect(client.from).toHaveBeenCalledWith("creator_profiles");
    });

    it("throws on error", async () => {
      const { client } = mockSupabase();
      const upsertChain = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Upsert failed" },
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue(upsertChain),
      });

      await expect(
        saveQuickProfile(userId, {
          primary_niche: "tech_software",
          primary_goal: "build_authority",
          target_audience: "SaaS founders",
        }),
      ).rejects.toThrow("Upsert failed");
    });
  });

  describe("completeOnboarding", () => {
    it("sets onboarded_at and clears onboarding_step", async () => {
      const { client } = mockSupabase();
      const updateChain = {
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      client.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateChain),
      });

      await completeOnboarding(userId);
      expect(client.from).toHaveBeenCalledWith("profiles");
    });

    it("throws on error", async () => {
      const { client } = mockSupabase();
      const updateChain = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Complete failed" },
        }),
      };
      client.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateChain),
      });

      await expect(completeOnboarding(userId)).rejects.toThrow(
        "Complete failed",
      );
    });
  });

  describe("getCreatorProfile", () => {
    it("returns creator profile when it exists", async () => {
      const { client } = mockSupabase();
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "cp-1",
              user_id: userId,
              primary_niche: "tech_software",
              primary_goal: "build_authority",
              target_audience: "SaaS founders",
            },
            error: null,
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const result = await getCreatorProfile(userId);
      expect(result).not.toBeNull();
      expect(result?.primary_niche).toBe("tech_software");
    });

    it("returns null when no profile exists", async () => {
      const { client } = mockSupabase();
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "Not found" },
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const result = await getCreatorProfile(userId);
      expect(result).toBeNull();
    });
  });
});
