-- Always create the booking conversation at the database boundary.
-- This prevents a booking from being created without its chat conversation.

create or replace function public.create_booking_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  professional_user uuid;
begin
  select p.user_id
    into professional_user
  from public.professionals p
  where p.id = new.professional_id;

  if professional_user is null
     or professional_user = new.customer_id then
    return new;
  end if;

  insert into public.conversations (
    participant_a,
    participant_b,
    booking_id,
    last_message,
    last_message_at
  )
  values (
    new.customer_id,
    professional_user,
    new.id,
    'Booking request: ' || coalesce(new.title, 'Booking'),
    now()
  )
  on conflict (booking_id) do nothing;

  return new;
end;
$function$;

drop trigger if exists trg_create_booking_conversation on public.bookings;

create trigger trg_create_booking_conversation
after insert on public.bookings
for each row
execute function public.create_booking_conversation();

-- Repair older bookings that were created without a conversation.
insert into public.conversations (
  participant_a,
  participant_b,
  booking_id,
  last_message,
  last_message_at
)
select
  b.customer_id,
  p.user_id,
  b.id,
  'Booking request: ' || coalesce(b.title, 'Booking'),
  coalesce(b.created_at, now())
from public.bookings b
join public.professionals p on p.id = b.professional_id
left join public.conversations c on c.booking_id = b.id
where c.id is null
  and p.user_id <> b.customer_id;
