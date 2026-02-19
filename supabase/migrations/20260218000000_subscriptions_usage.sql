-- Stripe subscriptions & usage tracking

-- Subscription status enum
create type subscription_status as enum (
  'active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete'
);

-- Subscriptions table (one per user)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  plan text not null,
  status text not null default 'incomplete',
  billing_cycle text not null default 'monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint subscriptions_user_id_key unique (user_id)
);

create index idx_subscriptions_stripe_customer on subscriptions (stripe_customer_id);
create index idx_subscriptions_status on subscriptions (status);

alter table subscriptions enable row level security;

-- Users can read their own subscription
create policy "subscriptions_select_own" on subscriptions
  for select using (auth.uid() = user_id);

-- Only service role can insert/update (via admin client in API routes)
-- No insert/update policies for authenticated users — all writes go through server

-- Usage tracking table (one row per user per billing period)
create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  posts_count integer not null default 0,
  ai_requests_count integer not null default 0,
  insights_count integer not null default 0,
  content_improvements_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint usage_tracking_user_period unique (user_id, period_start)
);

create index idx_usage_tracking_user on usage_tracking (user_id);
create index idx_usage_tracking_period on usage_tracking (period_start, period_end);

alter table usage_tracking enable row level security;

-- Users can read their own usage
create policy "usage_tracking_select_own" on usage_tracking
  for select using (auth.uid() = user_id);

-- Only service role can insert/update (via admin client in API routes)
