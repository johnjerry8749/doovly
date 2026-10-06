create or replace function public.create_booking_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  professional_user uuid;
  conversation_uuid uuid;
begin
  select p.user_id into professional_user
  from public.professionals p
  where p.id = new.professional_id;

  if professional_user is null or professional_user = new.customer_id then
    return new;
  end if;

  insert into public.conversations (
    participant_a, participant_b, booking_id, last_message, last_message_at
  )
  values (
    new.customer_id,
    professional_user,
    new.id,
    'Booking request: ' || coalesce(new.title, new.service_name, 'Booking'),
    now()
  )
  on conflict (booking_id) do update
    set last_message = excluded.last_message,
        last_message_at = excluded.last_message_at
  returning id into conversation_uuid;

  insert into public.messages (conversation_id, sender_id, text, kind, card)
  select
    conversation_uuid,
    new.customer_id,
    'Booking request: ' || coalesce(new.title, new.service_name, 'Booking'),
    'request_card',
    jsonb_build_object(
      'kind', 'booking',
      'title', coalesce(new.title, new.service_name, 'Booking'),
      'category', new.service_name,
      'location', coalesce(new.location, new.address),
      'description', new.notes,
      'amount', coalesce(new.amount, 0),
      'date', new.display_date,
      'statusLabel',
        case lower(coalesce(new.status, 'pending'))
          when 'pending' then 'Waiting for professional to accept'
          when 'declined' then 'This booking was declined'
          when 'cancelled' then 'This booking was declined'
          else 'Accepted'
        end
    )
  where not exists (
    select 1 from public.messages m
    where m.conversation_id = conversation_uuid
      and m.kind = 'request_card'
  );

  return new;
end;
$function$;

revoke execute on function public.create_booking_conversation() from public, anon, authenticated;

drop policy if exists "Users can send messages in own conversations" on public.messages;

create policy "Users can send messages in own conversations"
on public.messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
      and (
        messages.kind <> 'location'
        or c.booking_id is null
        or exists (
          select 1 from public.bookings b
          where b.id = c.booking_id
            and lower(coalesce(b.status, 'pending')) = 'accepted'
        )
        or (
          c.offer_id is not null
          and exists (
            select 1 from public.service_request_offers o
            where o.id = c.offer_id
              and lower(coalesce(o.status, 'pending')) = 'accepted'
          )
        )
      )
  )
);

delete from public.messages m
where m.kind = 'location'
  and exists (
    select 1
    from public.conversations c
    left join public.bookings b on b.id = c.booking_id
    left join public.service_request_offers o on o.id = c.offer_id
    where c.id = m.conversation_id
      and (
        (b.id is not null and lower(coalesce(b.status, 'pending')) <> 'accepted')
        or (o.id is not null and lower(coalesce(o.status, 'pending')) <> 'accepted')
      )
  );

insert into public.messages (conversation_id, sender_id, text, kind, card)
select
  c.id,
  b.customer_id,
  'Booking request: ' || coalesce(b.title, b.service_name, 'Booking'),
  'request_card',
  jsonb_build_object(
    'kind', 'booking',
    'title', coalesce(b.title, b.service_name, 'Booking'),
    'category', b.service_name,
    'location', coalesce(b.location, b.address),
    'description', b.notes,
    'amount', coalesce(b.amount, 0),
    'date', b.display_date,
    'statusLabel',
      case lower(coalesce(b.status, 'pending'))
        when 'pending' then 'Waiting for professional to accept'
        when 'declined' then 'This booking was declined'
        when 'cancelled' then 'This booking was declined'
        else 'Accepted'
      end
  )
from public.conversations c
join public.bookings b on b.id = c.booking_id
where c.booking_id is not null
  and not exists (
    select 1 from public.messages m
    where m.conversation_id = c.id and m.kind = 'request_card'
  );