import type { PlatformSlug } from "./platform-slug";

export const appUrl = {
  dashboard: (slug: PlatformSlug) => `/${slug}/dashboard`,
  content: (slug: PlatformSlug) => `/${slug}/content`,
  contentNew: (slug: PlatformSlug) => `/${slug}/content/new`,
  contentEdit: (slug: PlatformSlug, id: string) =>
    `/${slug}/content/${id}/edit`,
  insights: (slug: PlatformSlug) => `/${slug}/insights`,
  experiments: (slug: PlatformSlug) => `/${slug}/experiments`,
  connections: () => "/connections",
  settings: () => "/settings",
  settingsBilling: () => "/settings/billing",
};
