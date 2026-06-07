-- =============================================================================
-- call — Push Notification Subscriptions Table
-- =============================================================================

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null,
  p256dh_key    text not null,
  auth_key      text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Users can read their own subscription
drop policy if exists "Users can read own subscription" on public.push_subscriptions;
create policy "Users can read own subscription"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

-- Users can insert their own subscription
drop policy if exists "Users can insert own subscription" on public.push_subscriptions;
create policy "Users can insert own subscription"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

-- Users can update their own subscription
drop policy if exists "Users can update own subscription" on public.push_subscriptions;
create policy "Users can update own subscription"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own subscription
drop policy if exists "Users can delete own subscription" on public.push_subscriptions;
create policy "Users can delete own subscription"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
