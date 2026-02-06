-- Phase 5+6: Insights & Experiments tables

-- Insights
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null,
  headline text not null,
  detail text not null,
  data_points jsonb not null default '[]',
  action text not null,
  confidence text not null,
  status text not null default 'active',
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index idx_insights_user_status on insights (user_id, status);
create index idx_insights_generated on insights (generated_at);

alter table insights enable row level security;

create policy "insights_select_own" on insights for select using (auth.uid() = user_id);
create policy "insights_insert_own" on insights for insert with check (auth.uid() = user_id);
create policy "insights_update_own" on insights for update using (auth.uid() = user_id);

-- Experiments
create table experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null,
  hypothesis text not null,
  description text not null,
  status text not null default 'suggested',
  results jsonb,
  suggested_at timestamptz not null default now(),
  started_at timestamptz,
  created_at timestamptz default now()
);

create index idx_experiments_user_status on experiments (user_id, status);
create index idx_experiments_suggested on experiments (suggested_at);

alter table experiments enable row level security;

create policy "experiments_select_own" on experiments for select using (auth.uid() = user_id);
create policy "experiments_insert_own" on experiments for insert with check (auth.uid() = user_id);
create policy "experiments_update_own" on experiments for update using (auth.uid() = user_id);
