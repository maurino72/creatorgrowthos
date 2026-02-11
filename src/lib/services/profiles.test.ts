import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOnboardingState,
  saveQuickProfile,
  updateOnboardingStep,
  completeOnboarding,
  getCreatorProfile,
  updateCreatorProfile,
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
      const { client } = mockSupabase({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

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
    it("upserts creator profile with niches and goals arrays", async () => {
      const { client } = mockSupabase();

      const upsertMock = vi.fn();
      const upsertChain = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "cp-1",
              user_id: userId,
              niches: ["tech_software"],
              goals: ["build_authority"],
              target_audience: "SaaS founders",
            },
            error: null,
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        upsert: upsertMock.mockReturnValue(upsertChain),
      });

      const result = await saveQuickProfile(userId, {
        niches: ["tech_software"],
        goals: ["build_authority"],
        target_audience: "SaaS founders",
      });

      expect(result.niches).toEqual(["tech_software"]);
      expect(result.goals).toEqual(["build_authority"]);
      expect(client.from).toHaveBeenCalledWith("creator_profiles");
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          niches: ["tech_software"],
          goals: ["build_authority"],
          target_audience: "SaaS founders",
        }),
        { onConflict: "user_id" },
      );
    });

    it("resolves 'other' niche with custom_niche value", async () => {
      const { client } = mockSupabase();

      const upsertMock = vi.fn();
      const upsertChain = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "cp-1",
              user_id: userId,
              niches: ["tech_software", "Quantum Computing"],
              goals: ["build_authority"],
              target_audience: "SaaS founders",
            },
            error: null,
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        upsert: upsertMock.mockReturnValue(upsertChain),
      });

      await saveQuickProfile(userId, {
        niches: ["tech_software", "other"],
        goals: ["build_authority"],
        target_audience: "SaaS founders",
        custom_niche: "Quantum Computing",
      });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          niches: ["tech_software", "Quantum Computing"],
        }),
        { onConflict: "user_id" },
      );
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
          niches: ["tech_software"],
          goals: ["build_authority"],
          target_audience: "SaaS founders",
        }),
      ).rejects.toThrow("Upsert failed");
    });
  });

  describe("updateCreatorProfile", () => {
    it("updates partial profile data", async () => {
      const { client } = mockSupabase();

      const updateMock = vi.fn();
      const updateChain = {
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "cp-1",
                user_id: userId,
                niches: ["marketing", "design"],
                goals: ["build_authority"],
                target_audience: "SaaS founders",
              },
              error: null,
            }),
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        update: updateMock.mockReturnValue(updateChain),
      });

      const result = await updateCreatorProfile(userId, {
        niches: ["marketing", "design"],
      });

      expect(result.niches).toEqual(["marketing", "design"]);
      expect(client.from).toHaveBeenCalledWith("creator_profiles");
      expect(updateMock).toHaveBeenCalledWith({ niches: ["marketing", "design"] });
    });

    it("throws on error", async () => {
      const { client } = mockSupabase();

      const updateChain = {
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Update failed" },
            }),
          }),
        }),
      };
      client.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateChain),
      });

      await expect(
        updateCreatorProfile(userId, { goals: ["network"] }),
      ).rejects.toThrow("Update failed");
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
              niches: ["tech_software"],
              goals: ["build_authority"],
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
      expect(result?.niches).toEqual(["tech_software"]);
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
