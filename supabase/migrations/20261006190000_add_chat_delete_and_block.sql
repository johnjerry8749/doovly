alter table public.conversations
  add column if not exists blocked_by uuid null references public.profiles(id) on delete set null,
  add column if not exists blocked_at timestamptz null;

create index if not exists conversations_blocked_by_idx
  on public.conversations(blocked_by);

drop policy if exists "Users can delete own conversations" on public.conversations;

create policy "Users can delete own conversations"
  on public.conversations
  for delete
  to authenticated
  using (
    is_admin()
    or auth.uid() = participant_a
    or auth.uid() = participant_b
  );

create or replace function public.delete_my_conversation(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.conversations
  where id = p_conversation_id
    and (participant_a = auth.uid() or participant_b = auth.uid());
$$;

revoke execute on function public.delete_my_conversation(uuid) from public;
grant execute on function public.delete_my_conversation(uuid) to authenticated;
