-- =============================================================================
-- Fix contacts RLS: Allow both participants to manage contact entries
-- =============================================================================
-- Run this in Supabase SQL Editor if you already ran 00001_schema.sql
-- and are getting permission errors when accepting contact requests.
-- =============================================================================

drop policy if exists "Users can read own contacts" on public.contacts;
drop policy if exists "Users can insert contacts" on public.contacts;
drop policy if exists "Users can update own contacts" on public.contacts;
drop policy if exists "Users can delete own contacts" on public.contacts;

-- Allow both the sender (user_id) and recipient (contact_id) to view
create policy "Users can read own contacts"
  on public.contacts for select
  using (auth.uid() = user_id or auth.uid() = contact_id);

-- Allow both the sender (user_id) and recipient (contact_id) to insert
create policy "Users can insert contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

-- Allow both the sender (user_id) and recipient (contact_id) to update (accept, block, remove)
create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id or auth.uid() = contact_id)
  with check (auth.uid() = user_id or auth.uid() = contact_id);

-- Allow both the sender (user_id) and recipient (contact_id) to delete
create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id or auth.uid() = contact_id);
