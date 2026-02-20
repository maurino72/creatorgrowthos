import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  prefetchDashboard,
  prefetchContent,
  prefetchInsights,
  prefetchExperiments,
} from "./prefetch";

describe("prefetch helpers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);
  });

  describe("prefetchDashboard", () => {
    it("prefetches dashboard metrics, top posts, and insights", () => {
      prefetchDashboard(queryClient, 7, "twitter");
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(4);
    });

    it("uses default days of 7", () => {
      prefetchDashboard(queryClient);
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(4);
    });
  });

  describe("prefetchContent", () => {
    it("prefetches posts list", () => {
      prefetchContent(queryClient, "twitter");
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });

    it("works without platform", () => {
      prefetchContent(queryClient);
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("prefetchInsights", () => {
    it("prefetches insights list", () => {
      prefetchInsights(queryClient, "twitter");
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("prefetchExperiments", () => {
    it("prefetches experiments list", () => {
      prefetchExperiments(queryClient, "twitter");
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    });
  });
});
