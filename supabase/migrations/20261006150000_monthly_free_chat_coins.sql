-- Reset free Doovly chat coins every one-month billing period.
-- Pro users remain unlimited.

alter table public.chat_credits
  add column if not exists period_started_at timestamptz not null default now();

create or replace function public.get_my_chat_credits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_remaining integer;
  current_started timestamptz;
  next_started timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.chat_credits (user_id, remaining, period_started_at)
  values (uid, 15, now())
  on conflict (user_id) do nothing;

  select remaining, period_started_at
    into current_remaining, current_started
  from public.chat_credits
  where user_id = uid
  for update;

  if now() >= current_started + interval '1 month' then
    next_started := current_started;

    while now() >= next_started + interval '1 month' loop
      next_started := next_started + interval '1 month';
    end loop;

    update public.chat_credits
    set remaining = 15,
        period_started_at = next_started,
        updated_at = now()
    where user_id = uid;

    current_remaining := 15;
  end if;

  return current_remaining;
end;
$$;

create or replace function public.enforce_chat_message_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pro_user boolean;
  credits integer;
  period_started timestamptz;
  next_started timestamptz;
  booking_status text;
  offer_status text;
begin
  if new.kind in ('text', 'image') then
    if new.sender_id <> auth.uid() then
      raise exception 'You can only send messages as yourself';
    end if;

    if not exists (
      select 1 from public.conversations c
      where c.id = new.conversation_id
        and (c.participant_a = new.sender_id or c.participant_b = new.sender_id)
    ) then
      raise exception 'You are not a participant in this conversation';
    end if;

    pro_user := public.is_chat_pro(new.sender_id);

    if new.kind = 'image' and not pro_user then
      raise exception 'IMAGE_CHAT_PRO_REQUIRED';
    end if;

    if not pro_user then
      insert into public.chat_credits (user_id, remaining, period_started_at)
      values (new.sender_id, 15, now())
      on conflict (user_id) do nothing;

      select period_started_at
        into period_started
      from public.chat_credits
      where user_id = new.sender_id
      for update;

      if now() >= period_started + interval '1 month' then
        next_started := period_started;

        while now() >= next_started + interval '1 month' loop
          next_started := next_started + interval '1 month';
        end loop;

        update public.chat_credits
        set remaining = 15,
            period_started_at = next_started,
            updated_at = now()
        where user_id = new.sender_id;
      end if;

      update public.chat_credits
      set remaining = remaining - 1,
          updated_at = now()
      where user_id = new.sender_id
        and remaining > 0
      returning remaining into credits;

      if not found then
        raise exception 'CHAT_CREDITS_EXHAUSTED';
      end if;
    end if;
  end if;

  if new.kind = 'location' then
    select lower(coalesce(b.status, ''))
    into booking_status
    from public.conversations c
    left join public.bookings b on b.id = c.booking_id
    where c.id = new.conversation_id;

    if booking_status is not null and booking_status <> '' then
      if booking_status not in ('accepted', 'ongoing', 'upcoming', 'booked', 'awaiting_approval') then
        raise exception 'LOCATION_REQUIRES_PROVIDER_APPROVAL';
      end if;
    else
      select lower(coalesce(sro.status, ''))
      into offer_status
      from public.conversations c
      left join public.service_request_offers sro on sro.id = c.offer_id
      where c.id = new.conversation_id;

      if offer_status is not null and offer_status <> 'accepted' then
        raise exception 'LOCATION_REQUIRES_PROVIDER_APPROVAL';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_chat_message_rules on public.messages;
create trigger trg_enforce_chat_message_rules
before insert on public.messages
for each row execute function public.enforce_chat_message_rules();

revoke execute on function public.get_my_chat_credits() from public, anon;
grant execute on function public.get_my_chat_credits() to authenticated;
revoke execute on function public.enforce_chat_message_rules() from public, anon, authenticated;
