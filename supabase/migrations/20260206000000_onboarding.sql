-- Onboarding: Add onboarding_step to profiles and create creator_profiles table

-- Add onboarding_step to profiles
alter table profiles add column if not exists onboarding_step text;

-- Creator profiles (Quick Profile + future Full Profile)
create table creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade unique,
  primary_niche text not null,
  primary_goal text not null,
  target_audience text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_creator_profiles_user on creator_profiles (user_id);

create trigger creator_profiles_updated_at
  before update on creator_profiles
  for each row execute function update_updated_at();

-- Content imports tracking
create table content_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  platform text not null,
  requested_count int not null,
  imported_count int default 0,
  failed_count int default 0,
  status text not null default 'pending',
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_content_imports_user on content_imports (user_id);

-- RLS
alter table creator_profiles enable row level security;
alter table content_imports enable row level security;

create policy "creator_profiles_select_own" on creator_profiles for select using (auth.uid() = user_id);
create policy "creator_profiles_insert_own" on creator_profiles for insert with check (auth.uid() = user_id);
create policy "creator_profiles_update_own" on creator_profiles for update using (auth.uid() = user_id);

create policy "content_imports_select_own" on content_imports for select using (auth.uid() = user_id);
create policy "content_imports_insert_own" on content_imports for insert with check (auth.uid() = user_id);
create policy "content_imports_update_own" on content_imports for update using (auth.uid() = user_id);
