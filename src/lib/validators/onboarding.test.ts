import { describe, it, expect } from "vitest";
import {
  quickProfileSchema,
  updateStepSchema,
  ONBOARDING_STEPS,
  NICHES,
  GOALS,
  type QuickProfileInput,
} from "./onboarding";

describe("onboarding validators", () => {
  describe("quickProfileSchema", () => {
    it("validates a correct quick profile", () => {
      const input: QuickProfileInput = {
        primary_niche: "tech_software",
        primary_goal: "build_authority",
        target_audience: "Early-stage SaaS founders",
      };
      const result = quickProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects missing niche", () => {
      const result = quickProfileSchema.safeParse({
        primary_goal: "build_authority",
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid niche", () => {
      const result = quickProfileSchema.safeParse({
        primary_niche: "not_a_real_niche",
        primary_goal: "build_authority",
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing goal", () => {
      const result = quickProfileSchema.safeParse({
        primary_niche: "tech_software",
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid goal", () => {
      const result = quickProfileSchema.safeParse({
        primary_niche: "tech_software",
        primary_goal: "not_a_real_goal",
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects target audience shorter than 5 characters", () => {
      const result = quickProfileSchema.safeParse({
        primary_niche: "tech_software",
        primary_goal: "build_authority",
        target_audience: "Hi",
      });
      expect(result.success).toBe(false);
    });

    it("rejects target audience longer than 100 characters", () => {
      const result = quickProfileSchema.safeParse({
        primary_niche: "tech_software",
        primary_goal: "build_authority",
        target_audience: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("accepts custom niche with other value", () => {
      const result = quickProfileSchema.safeParse({
        primary_niche: "other",
        primary_goal: "build_authority",
        target_audience: "Early-stage SaaS founders",
        custom_niche: "Quantum Computing",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid niches", () => {
      for (const niche of NICHES) {
        const result = quickProfileSchema.safeParse({
          primary_niche: niche.value,
          primary_goal: "build_authority",
          target_audience: "Developers",
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts all valid goals", () => {
      for (const goal of GOALS) {
        const result = quickProfileSchema.safeParse({
          primary_niche: "tech_software",
          primary_goal: goal.value,
          target_audience: "Developers",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("updateStepSchema", () => {
    it("validates a valid step", () => {
      const result = updateStepSchema.safeParse({ step: "welcome" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid step", () => {
      const result = updateStepSchema.safeParse({ step: "invalid_step" });
      expect(result.success).toBe(false);
    });

    it("accepts all valid steps", () => {
      for (const step of ONBOARDING_STEPS) {
        const result = updateStepSchema.safeParse({ step });
        expect(result.success).toBe(true);
      }
    });
  });
});
