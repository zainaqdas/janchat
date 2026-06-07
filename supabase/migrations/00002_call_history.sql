-- =============================================================================
-- call — Call History Table
-- =============================================================================

create table if not exists public.call_history (
  id          uuid primary key default gen_random_uuid(),
  call_id     text not null,
  caller_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  call_type   text not null check (call_type in ('audio', 'video')),
  status      text not null default 'missed'
              check (status in ('missed', 'answered', 'rejected')),
  duration    integer not null default 0,  -- seconds
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create index if not exists idx_call_history_caller on public.call_history (caller_id);
create index if not exists idx_call_history_receiver on public.call_history (receiver_id);
create index if not exists idx_call_history_participants
  on public.call_history (least(caller_id, receiver_id), greatest(caller_id, receiver_id), started_at desc);

alter table public.call_history enable row level security;

-- Users can read call history they are involved in
drop policy if exists "Users can read call history" on public.call_history;
create policy "Users can read call history"
  on public.call_history for select
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

-- Users can insert call history records
drop policy if exists "Users can insert call history" on public.call_history;
create policy "Users can insert call history"
  on public.call_history for insert
  with check (auth.uid() = caller_id or auth.uid() = receiver_id);

-- Users can update call history they are involved in (e.g., update duration/status)
drop policy if exists "Users can update call history" on public.call_history;
create policy "Users can update call history"
  on public.call_history for update
  using (auth.uid() = caller_id or auth.uid() = receiver_id)
  with check (auth.uid() = caller_id or auth.uid() = receiver_id);
