import { describe, it, expect } from "vitest";
import {
  type PlanType,
  type BillingCycle,
  PLANS,
  PLAN_LIMITS,
  PLAN_PRICING,
  getPlanLimits,
  getPriceId,
  getUpgradePath,
  isValidPlan,
  isValidBillingCycle,
  getPlanDisplayName,
  getPlanDescription,
  planSchema,
  billingCycleSchema,
} from "./plans";

describe("plans", () => {
  describe("PLANS", () => {
    it("defines three plan tiers", () => {
      expect(PLANS).toEqual(["starter", "business", "agency"]);
    });
  });

  describe("PLAN_LIMITS", () => {
    it("defines starter limits", () => {
      expect(PLAN_LIMITS.starter).toEqual({
        posts_per_month: 30,
        scheduled_posts: 10,
        drafts: 20,
        platforms: 1,
        ai_improvements: 5,
        insights: 5,
        content_import: 0,
        historical_data_days: 30,
      });
    });

    it("defines business limits", () => {
      expect(PLAN_LIMITS.business).toEqual({
        posts_per_month: 100,
        scheduled_posts: 50,
        drafts: -1,
        platforms: 3,
        ai_improvements: -1,
        insights: -1,
        content_import: 500,
        historical_data_days: 365,
      });
    });

    it("defines agency limits with unlimited (-1)", () => {
      expect(PLAN_LIMITS.agency).toEqual({
        posts_per_month: -1,
        scheduled_posts: -1,
        drafts: -1,
        platforms: -1,
        ai_improvements: -1,
        insights: -1,
        content_import: -1,
        historical_data_days: -1,
      });
    });
  });

  describe("PLAN_PRICING", () => {
    it("defines starter pricing", () => {
      expect(PLAN_PRICING.starter).toEqual({
        monthly: 19,
        yearly: 190,
        monthly_equivalent_yearly: 15.83,
        yearly_savings: 38,
      });
    });

    it("defines business pricing", () => {
      expect(PLAN_PRICING.business).toEqual({
        monthly: 49,
        yearly: 490,
        monthly_equivalent_yearly: 40.83,
        yearly_savings: 98,
      });
    });

    it("defines agency pricing", () => {
      expect(PLAN_PRICING.agency).toEqual({
        monthly: 99,
        yearly: 990,
        monthly_equivalent_yearly: 82.5,
        yearly_savings: 198,
      });
    });
  });

  describe("getPlanLimits", () => {
    it("returns limits for each plan", () => {
      expect(getPlanLimits("starter").posts_per_month).toBe(30);
      expect(getPlanLimits("business").posts_per_month).toBe(100);
      expect(getPlanLimits("agency").posts_per_month).toBe(-1);
    });

    it("returns the correct limits object", () => {
      expect(getPlanLimits("starter")).toBe(PLAN_LIMITS.starter);
    });
  });

  describe("getPriceId", () => {
    it("returns price ID for starter monthly", () => {
      const priceId = getPriceId("starter", "monthly");
      expect(typeof priceId).toBe("string");
    });

    it("returns price ID for starter yearly", () => {
      const priceId = getPriceId("starter", "yearly");
      expect(typeof priceId).toBe("string");
    });

    it("returns price ID for business monthly", () => {
      const priceId = getPriceId("business", "monthly");
      expect(typeof priceId).toBe("string");
    });

    it("returns price ID for business yearly", () => {
      const priceId = getPriceId("business", "yearly");
      expect(typeof priceId).toBe("string");
    });

    it("returns price ID for agency monthly", () => {
      const priceId = getPriceId("agency", "monthly");
      expect(typeof priceId).toBe("string");
    });

    it("returns price ID for agency yearly", () => {
      const priceId = getPriceId("agency", "yearly");
      expect(typeof priceId).toBe("string");
    });
  });

  describe("getUpgradePath", () => {
    it("returns business as upgrade from starter", () => {
      expect(getUpgradePath("starter")).toBe("business");
    });

    it("returns agency as upgrade from business", () => {
      expect(getUpgradePath("business")).toBe("agency");
    });

    it("returns null for agency (no upgrade available)", () => {
      expect(getUpgradePath("agency")).toBeNull();
    });
  });

  describe("isValidPlan", () => {
    it("returns true for valid plans", () => {
      expect(isValidPlan("starter")).toBe(true);
      expect(isValidPlan("business")).toBe(true);
      expect(isValidPlan("agency")).toBe(true);
    });

    it("returns false for invalid plans", () => {
      expect(isValidPlan("free")).toBe(false);
      expect(isValidPlan("enterprise")).toBe(false);
      expect(isValidPlan("")).toBe(false);
    });
  });

  describe("isValidBillingCycle", () => {
    it("returns true for valid billing cycles", () => {
      expect(isValidBillingCycle("monthly")).toBe(true);
      expect(isValidBillingCycle("yearly")).toBe(true);
    });

    it("returns false for invalid billing cycles", () => {
      expect(isValidBillingCycle("weekly")).toBe(false);
      expect(isValidBillingCycle("")).toBe(false);
    });
  });

  describe("getPlanDisplayName", () => {
    it("returns display names", () => {
      expect(getPlanDisplayName("starter")).toBe("Starter");
      expect(getPlanDisplayName("business")).toBe("Business");
      expect(getPlanDisplayName("agency")).toBe("Agency");
    });
  });

  describe("getPlanDescription", () => {
    it("returns descriptions for each plan", () => {
      expect(getPlanDescription("starter")).toBe(
        "Perfect for getting started"
      );
      expect(getPlanDescription("business")).toBe(
        "For serious multi-platform creators"
      );
      expect(getPlanDescription("agency")).toBe(
        "Unlimited power for agencies"
      );
    });
  });

  describe("planSchema", () => {
    it("validates valid plans", () => {
      expect(planSchema.parse("starter")).toBe("starter");
      expect(planSchema.parse("business")).toBe("business");
      expect(planSchema.parse("agency")).toBe("agency");
    });

    it("rejects invalid plans", () => {
      expect(() => planSchema.parse("free")).toThrow();
      expect(() => planSchema.parse("")).toThrow();
    });
  });

  describe("billingCycleSchema", () => {
    it("validates valid billing cycles", () => {
      expect(billingCycleSchema.parse("monthly")).toBe("monthly");
      expect(billingCycleSchema.parse("yearly")).toBe("yearly");
    });

    it("rejects invalid billing cycles", () => {
      expect(() => billingCycleSchema.parse("weekly")).toThrow();
      expect(() => billingCycleSchema.parse("")).toThrow();
    });
  });

  describe("feature gating helpers", () => {
    it("starter has limited platforms", () => {
      expect(getPlanLimits("starter").platforms).toBe(1);
    });

    it("business has 3 platforms", () => {
      expect(getPlanLimits("business").platforms).toBe(3);
    });

    it("agency has unlimited platforms", () => {
      expect(getPlanLimits("agency").platforms).toBe(-1);
    });

    it("starter has no content import", () => {
      expect(getPlanLimits("starter").content_import).toBe(0);
    });

    it("business allows 500 content imports", () => {
      expect(getPlanLimits("business").content_import).toBe(500);
    });
  });
});
