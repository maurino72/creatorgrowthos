-- Settings: Add bio, website, preferences columns to profiles

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists website text;
alter table profiles add column if not exists preferences jsonb not null default '{}';
