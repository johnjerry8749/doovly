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
  on conflict (booking_id) where booking_id is not null do update
    set participant_a = excluded.participant_a,
        participant_b = excluded.participant_b,
        last_message = excluded.last_message,
        last_message_at = excluded.last_message_at
  returning id into conversation_uuid;

  insert into public.messages (
    conversation_id, sender_id, text, kind, card
  )
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
    select 1
    from public.messages m
    where m.conversation_id = conversation_uuid
      and m.kind = 'request_card'
  );

  return new;
end;
$function$;