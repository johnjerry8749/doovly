-- Chat monetization and privacy rules
-- 15 free chat coins per user, Pro unlimited text/images/calls.
-- Location sharing is only allowed after booking/offer approval.

insert into public.service_categories (name, icon, sort_order)
select 'Other', 'briefcase-outline', coalesce(max(sort_order), 0) + 1
from public.service_categories
where not exists (
  select 1 from public.service_categories where lower(trim(name)) = 'other'
);

alter table public.professionals alter column profession set default 'Other';
alter table public.profiles alter column profession set default 'Other';

update public.profiles
set profession = 'Other'
where profession is null or btrim(profession) = '';

create table if not exists public.chat_credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  remaining integer not null default 15,
  updated_at timestamptz not null default now(),
  constraint chat_credits_remaining_check check (remaining >= 0)
);

alter table public.chat_credits enable row level security;

drop policy if exists "Users can view own chat credits" on public.chat_credits;
create policy "Users can view own chat credits"
on public.chat_credits
for select to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.chat_credits from anon, authenticated;

insert into public.chat_credits (user_id, remaining)
select id, 15 from public.profiles
on conflict (user_id) do nothing;

alter table public.messages add column if not exists image_url text;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
check (kind = any (array[
  'text'::text, 'image'::text, 'location'::text,
  'location_stopped'::text, 'request_card'::text, 'system'::text
]));

create or replace function public.is_chat_pro(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.professionals p
    where p.user_id = p_user_id and p.subscribed = true
  );
$$;

revoke execute on function public.is_chat_pro(uuid) from public, anon, authenticated;

create or replace function public.enforce_chat_message_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pro_user boolean;
  credits integer;
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
      insert into public.chat_credits (user_id, remaining)
      values (new.sender_id, 15)
      on conflict (user_id) do nothing;

      update public.chat_credits
      set remaining = remaining - 1, updated_at = now()
      where user_id = new.sender_id and remaining > 0
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

      if offer_status is not null and offer_status <> '' and offer_status <> 'accepted' then
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

revoke execute on function public.enforce_chat_message_rules() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  next_role text;
begin
  next_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');

  if next_role not in ('user', 'admin', 'professional') then
    next_role := 'user';
  end if;

  insert into public.profiles (
    id, full_name, phone, email, role, city, profession, mock_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'User'),
    new.phone,
    new.email,
    next_role,
    new.raw_user_meta_data ->> 'city',
    'Other',
    new.raw_user_meta_data ->> 'mock_id'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  insert into public.chat_credits (user_id, remaining)
  values (new.id, 15)
  on conflict (user_id) do nothing;

  insert into public.notifications (
    user_id, type, title, body, unread, avatar_url, time_label
  )
  values (
    new.id, 'general', 'Welcome to Doovly 👋',
    'Thanks for joining Doovly! Explore services and find trusted professionals near you.',
    true, null, 'Just now'
  );

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
