import { z } from "zod";
import { planSchema, billingCycleSchema } from "@/lib/stripe/plans";

export const checkoutSchema = z.object({
  plan: planSchema,
  billing_cycle: billingCycleSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const upgradeSchema = z.object({
  plan: planSchema,
  billing_cycle: billingCycleSchema,
});

export type UpgradeInput = z.infer<typeof upgradeSchema>;
