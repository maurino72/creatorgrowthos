"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import type { PlanType, BillingCycle } from "@/lib/stripe/plans";

export const billingKeys = {
  all: ["billing"] as const,
  subscription: ["billing", "subscription"] as const,
  usage: ["billing", "usage"] as const,
  invoices: ["billing", "invoices"] as const,
};

async function fetchSubscription() {
  const response = await fetch("/api/billing/subscription");
  if (!response.ok) {
    throw new Error("Failed to fetch subscription");
  }
  const data = await response.json();
  return data.subscription;
}

async function fetchUsage() {
  const response = await fetch("/api/billing/usage");
  if (!response.ok) {
    throw new Error("Failed to fetch usage");
  }
  const data = await response.json();
  return data.usage;
}

async function fetchInvoices() {
  const response = await fetch("/api/billing/invoices");
  if (!response.ok) {
    throw new Error("Failed to fetch invoices");
  }
  const data = await response.json();
  return data.invoices;
}

async function createCheckout(input: {
  plan: PlanType;
  billing_cycle: BillingCycle;
}) {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }
  const data = await response.json();
  return data.url as string;
}

async function createPortal() {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to create portal session");
  }
  const data = await response.json();
  return data.url as string;
}

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: fetchSubscription,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: billingKeys.usage,
    queryFn: fetchUsage,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: billingKeys.invoices,
    queryFn: fetchInvoices,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: createCheckout,
  });
}

export function usePortal() {
  return useMutation({
    mutationFn: createPortal,
  });
}
