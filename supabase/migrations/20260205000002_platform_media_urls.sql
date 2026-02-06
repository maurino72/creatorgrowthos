-- Add platform_media_urls to post_publications for storing Twitter CDN URLs
alter table post_publications
  add column platform_media_urls text[] default '{}';
