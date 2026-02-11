import { describe, it, expect } from "vitest";
import {
  quickProfileSchema,
  updateCreatorProfileSchema,
  updateStepSchema,
  ONBOARDING_STEPS,
  NICHES,
  GOALS,
  type QuickProfileInput,
} from "./onboarding";

describe("onboarding validators", () => {
  describe("quickProfileSchema", () => {
    it("validates a correct quick profile with arrays", () => {
      const input: QuickProfileInput = {
        niches: ["tech_software"],
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
      };
      const result = quickProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts up to 3 niches", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software", "marketing", "design"],
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty niches array", () => {
      const result = quickProfileSchema.safeParse({
        niches: [],
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 3 niches", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software", "marketing", "design", "finance"],
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing niches", () => {
      const result = quickProfileSchema.safeParse({
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid niche value", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["not_a_real_niche"],
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("accepts up to 3 goals", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: ["build_authority", "grow_audience", "get_clients"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty goals array", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: [],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 3 goals", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: ["build_authority", "grow_audience", "get_clients", "network"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing goals", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid goal value", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: ["not_a_real_goal"],
        target_audience: "Early-stage SaaS founders",
      });
      expect(result.success).toBe(false);
    });

    it("rejects target audience shorter than 5 characters", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: ["build_authority"],
        target_audience: "Hi",
      });
      expect(result.success).toBe(false);
    });

    it("rejects target audience longer than 100 characters", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: ["build_authority"],
        target_audience: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("accepts custom niche when 'other' is in niches array", () => {
      const result = quickProfileSchema.safeParse({
        niches: ["tech_software", "other"],
        goals: ["build_authority"],
        target_audience: "Early-stage SaaS founders",
        custom_niche: "Quantum Computing",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid niches individually", () => {
      for (const niche of NICHES) {
        const result = quickProfileSchema.safeParse({
          niches: [niche.value],
          goals: ["build_authority"],
          target_audience: "Developers",
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts all valid goals individually", () => {
      for (const goal of GOALS) {
        const result = quickProfileSchema.safeParse({
          niches: ["tech_software"],
          goals: [goal.value],
          target_audience: "Developers",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("updateCreatorProfileSchema", () => {
    it("validates with only niches", () => {
      const result = updateCreatorProfileSchema.safeParse({
        niches: ["tech_software", "marketing"],
      });
      expect(result.success).toBe(true);
    });

    it("validates with only goals", () => {
      const result = updateCreatorProfileSchema.safeParse({
        goals: ["build_authority"],
      });
      expect(result.success).toBe(true);
    });

    it("validates with only target_audience", () => {
      const result = updateCreatorProfileSchema.safeParse({
        target_audience: "SaaS founders",
      });
      expect(result.success).toBe(true);
    });

    it("validates with all fields", () => {
      const result = updateCreatorProfileSchema.safeParse({
        niches: ["tech_software"],
        goals: ["build_authority"],
        target_audience: "SaaS founders",
      });
      expect(result.success).toBe(true);
    });

    it("validates empty object (no fields required)", () => {
      const result = updateCreatorProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects empty niches array", () => {
      const result = updateCreatorProfileSchema.safeParse({
        niches: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 3 niches", () => {
      const result = updateCreatorProfileSchema.safeParse({
        niches: ["tech_software", "marketing", "design", "finance"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 3 goals", () => {
      const result = updateCreatorProfileSchema.safeParse({
        goals: ["build_authority", "grow_audience", "get_clients", "network"],
      });
      expect(result.success).toBe(false);
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
