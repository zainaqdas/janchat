-- =============================================================================
-- call — Complete Database Schema
-- =============================================================================

-- 1. PROFILES TABLE
--    (auto-created via trigger when a new user signs up via Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

-- 2. CONTACTS TABLE
create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending'
             check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  -- prevent duplicate contact rows
  unique (user_id, contact_id)
);

-- 3. MESSAGES TABLE
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now(),
  read        boolean not null default false
);

-- 4. CALL_SIGNALS TABLE (used for WebRTC signaling persistence / fallback)
create table if not exists public.call_signals (
  id               uuid primary key default gen_random_uuid(),
  caller_id        uuid not null references public.profiles(id) on delete cascade,
  receiver_id      uuid not null references public.profiles(id) on delete cascade,
  signal_type      text not null check (signal_type in ('offer', 'answer', 'ice-candidate')),
  signal_data      jsonb not null,
  call_id          text not null,
  created_at       timestamptz not null default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_profiles_last_seen on public.profiles (last_seen);

create index if not exists idx_contacts_user_id on public.contacts (user_id);
create index if not exists idx_contacts_contact_id on public.contacts (contact_id);
create index if not exists idx_contacts_status on public.contacts (status);

create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_receiver_id on public.messages (receiver_id);
create index if not exists idx_messages_participants
  on public.messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at desc);

create index if not exists idx_call_signals_call_id on public.call_signals (call_id);
create index if not exists idx_call_signals_receiver on public.call_signals (receiver_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.messages enable row level security;
alter table public.call_signals enable row level security;

-- PROFILES
-- Everyone can read all profiles (needed for user search)
create policy "Anyone can read profiles"
  on public.profiles for select
  using (true);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- CONTACTS
-- Users can read contacts they are part of (as sender or recipient)
create policy "Users can read own contacts"
  on public.contacts for select
  using (auth.uid() = user_id or auth.uid() = contact_id);

-- Users can insert contact requests
create policy "Users can insert contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

-- Users can update contacts they are part of (accept, block, remove)
create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id or auth.uid() = contact_id)
  with check (auth.uid() = user_id or auth.uid() = contact_id);

-- Users can delete contacts they are part of
create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id or auth.uid() = contact_id);

-- MESSAGES
-- Users can read messages they sent or received
create policy "Users can read their messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can send messages
create policy "Users can insert messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Users can mark messages as read (only their received messages)
create policy "Users can update messages they received"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- CALL_SIGNALS
-- Users can read call signals they are involved in
create policy "Users can read call signals"
  on public.call_signals for select
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

-- Users can insert call signals
create policy "Users can insert call signals"
  on public.call_signals for insert
  with check (auth.uid() = caller_id);

-- Users can delete their own call signals
create policy "Users can delete call signals"
  on public.call_signals for delete
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

-- =============================================================================
-- AUTO-PROFILE CREATION TRIGGER
-- =============================================================================
-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- SUPABASE REALTIME
-- =============================================================================
-- Enable realtime for the tables that need it
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.contacts;
alter publication supabase_realtime add table public.call_signals;
