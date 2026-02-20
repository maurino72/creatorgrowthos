import type { QueryClient } from "@tanstack/react-query";
import { metricKeys } from "./metrics";
import { postKeys } from "./posts";
import { insightKeys } from "./insights";
import { experimentKeys } from "./experiments";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

export function prefetchDashboard(
  queryClient: QueryClient,
  days = 7,
  platform?: string,
) {
  const params = new URLSearchParams({ days: String(days) });
  if (platform) params.set("platform", platform);

  const topParams = new URLSearchParams({ days: String(days), limit: "5" });
  if (platform) topParams.set("platform", platform);

  const insightParams = new URLSearchParams({ status: "active", limit: "3" });
  if (platform) insightParams.set("platform", platform);

  queryClient.prefetchQuery({
    queryKey: metricKeys.dashboard(days, platform),
    queryFn: () => fetchJson(`/api/dashboard/metrics?${params}`),
  });

  queryClient.prefetchQuery({
    queryKey: metricKeys.topPosts(days, 5, platform),
    queryFn: () => fetchJson(`/api/dashboard/metrics/top?${topParams}`).then((d) => d.posts),
  });

  queryClient.prefetchQuery({
    queryKey: metricKeys.timeSeries(days, platform),
    queryFn: () => fetchJson(`/api/dashboard/metrics/timeseries?${params}`).then((d) => d.series),
  });

  queryClient.prefetchQuery({
    queryKey: insightKeys.list({ limit: 3, platform }),
    queryFn: () => fetchJson(`/api/insights?${insightParams}`).then((d) => d.insights),
  });
}

export function prefetchContent(
  queryClient: QueryClient,
  platform?: string,
) {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  const url = `/api/posts${params.toString() ? `?${params}` : ""}`;

  queryClient.prefetchQuery({
    queryKey: platform ? postKeys.list({ platform }) : postKeys.all,
    queryFn: () => fetchJson(url).then((d) => d.posts),
  });
}

export function prefetchInsights(
  queryClient: QueryClient,
  platform?: string,
) {
  const params = new URLSearchParams({ status: "active" });
  if (platform) params.set("platform", platform);

  queryClient.prefetchQuery({
    queryKey: insightKeys.list({ status: "active", platform }),
    queryFn: () => fetchJson(`/api/insights?${params}`).then((d) => d.insights),
  });
}

export function prefetchExperiments(
  queryClient: QueryClient,
  platform?: string,
) {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);

  queryClient.prefetchQuery({
    queryKey: platform ? experimentKeys.list({ platform }) : experimentKeys.all,
    queryFn: () => fetchJson(`/api/experiments?${params}`).then((d) => d.experiments),
  });
}
