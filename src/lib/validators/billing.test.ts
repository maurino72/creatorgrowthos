import { describe, it, expect } from "vitest";
import {
  checkoutSchema,
  type CheckoutInput,
} from "./billing";

describe("billing validators", () => {
  describe("checkoutSchema", () => {
    it("validates a valid monthly checkout", () => {
      const input: CheckoutInput = {
        plan: "starter",
        billing_cycle: "monthly",
      };
      expect(checkoutSchema.parse(input)).toEqual(input);
    });

    it("validates a valid yearly checkout", () => {
      const input: CheckoutInput = {
        plan: "agency",
        billing_cycle: "yearly",
      };
      expect(checkoutSchema.parse(input)).toEqual(input);
    });

    it("validates all plan types", () => {
      for (const plan of ["starter", "business", "agency"]) {
        expect(
          checkoutSchema.parse({ plan, billing_cycle: "monthly" })
        ).toEqual({ plan, billing_cycle: "monthly" });
      }
    });

    it("rejects invalid plan", () => {
      expect(() =>
        checkoutSchema.parse({ plan: "free", billing_cycle: "monthly" })
      ).toThrow();
    });

    it("rejects invalid billing cycle", () => {
      expect(() =>
        checkoutSchema.parse({ plan: "starter", billing_cycle: "weekly" })
      ).toThrow();
    });

    it("rejects missing plan", () => {
      expect(() =>
        checkoutSchema.parse({ billing_cycle: "monthly" })
      ).toThrow();
    });

    it("rejects missing billing_cycle", () => {
      expect(() => checkoutSchema.parse({ plan: "starter" })).toThrow();
    });

    it("rejects empty object", () => {
      expect(() => checkoutSchema.parse({})).toThrow();
    });
  });
});
