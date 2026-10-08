create or replace function public.increment_conversation_unread(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_is_member boolean;
begin
  if v_sender is null then raise exception 'Not authenticated'; end if;
  select exists(
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.participant_a = v_sender or c.participant_b = v_sender)
  ) into v_is_member;
  if not v_is_member then raise exception 'Not a conversation participant'; end if;

  select case when participant_a = v_sender then participant_b else participant_a end
    into v_recipient
  from public.conversations
  where id = p_conversation_id;

  insert into public.conversation_reads(conversation_id, user_id, unread_count, last_read_at)
  values (p_conversation_id, v_recipient, 1, null)
  on conflict (conversation_id, user_id)
  do update set unread_count = public.conversation_reads.unread_count + 1;
end;
$$;

revoke all on function public.increment_conversation_unread(uuid) from public;
grant execute on function public.increment_conversation_unread(uuid) to authenticated;
