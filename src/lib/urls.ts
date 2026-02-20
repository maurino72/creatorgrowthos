import type { PlatformSlug } from "./platform-slug";

export const appUrl = {
  dashboard: (slug: PlatformSlug) => `/${slug}/dashboard`,
  content: (slug: PlatformSlug) => `/${slug}/content`,
  contentNew: (slug: PlatformSlug) => `/${slug}/content/new`,
  contentNewThread: (slug: PlatformSlug) => `/${slug}/content/new/thread`,
  contentEdit: (slug: PlatformSlug, id: string) =>
    `/${slug}/content/${id}/edit`,
  insights: (slug: PlatformSlug) => `/${slug}/insights`,
  analytics: (slug: PlatformSlug) => `/${slug}/analytics`,
  experiments: (slug: PlatformSlug) => `/${slug}/experiments`,
  connections: () => "/connections",
  settings: () => "/settings",
  settingsBilling: () => "/settings/billing",
};
