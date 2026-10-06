-- Keep exactly one social-style DM thread per user pair.
-- Booking/request records reuse that thread; acceptance controls when text is unlocked.

with ranked as (
  select
    id,
    first_value(id) over (
      partition by least(participant_a, participant_b), greatest(participant_a, participant_b)
      order by created_at desc, id desc
    ) as keep_id,
    row_number() over (
      partition by least(participant_a, participant_b), greatest(participant_a, participant_b)
      order by created_at desc, id desc
    ) as rn
  from public.conversations
)
update public.messages m
set conversation_id = r.keep_id
from ranked r
where m.conversation_id = r.id
  and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by least(participant_a, participant_b), greatest(participant_a, participant_b)
      order by created_at desc, id desc
    ) as rn
  from public.conversations
)
delete from public.conversations c
using ranked r
where c.id = r.id
  and r.rn > 1;

create unique index if not exists conversations_one_thread_per_pair
  on public.conversations (
    least(participant_a, participant_b),
    greatest(participant_a, participant_b)
  );

create or replace function public.create_booking_conversation()
returns trigger language plpgsql security definer set search_path=public as $function$
declare
  professional_user uuid;
  conversation_uuid uuid;
begin
  select p.user_id into professional_user from public.professionals p where p.id = new.professional_id;
  if professional_user is null or professional_user = new.customer_id then return new; end if;

  select c.id into conversation_uuid
  from public.conversations c
  where (c.participant_a = new.customer_id and c.participant_b = professional_user)
     or (c.participant_b = new.customer_id and c.participant_a = professional_user)
  order by c.last_message_at desc nulls last limit 1;

  if conversation_uuid is not null then
    update public.conversations
    set participant_a = new.customer_id,
        participant_b = professional_user,
        booking_id = new.id,
        service_request_id = null,
        offer_id = null,
        last_message = 'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),
        last_message_at = now()
    where id = conversation_uuid;
  else
    insert into public.conversations(participant_a,participant_b,booking_id,last_message,last_message_at)
    values(new.customer_id,professional_user,new.id,
      'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),now())
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(
    conversation_uuid,new.customer_id,
    'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),
    'request_card',
    jsonb_build_object(
      'kind','booking',
      'title',coalesce(new.title,new.service_name,'Booking'),
      'category',new.service_name,
      'location',coalesce(new.location,new.address),
      'description',new.notes,
      'amount',coalesce(new.amount,0),
      'date',new.display_date,
      'statusLabel',
        case lower(coalesce(new.status,'pending'))
          when 'pending' then 'Waiting for professional to accept'
          when 'declined' then 'This booking was declined'
          when 'cancelled' then 'This booking was declined'
          else 'Accepted'
        end
    )
  );
  return new;
end; $function$;

create or replace function public.create_offer_conversation()
returns trigger language plpgsql security definer set search_path=public as $function$
declare
  request_row record;
  conversation_uuid uuid;
begin
  select r.created_by,r.title,r.category,r.location,r.city,r.description
  into request_row
  from public.service_requests r where r.id = new.request_id;

  if request_row.created_by is null or new.user_id is null or request_row.created_by = new.user_id then return new; end if;

  select c.id into conversation_uuid
  from public.conversations c
  where (c.participant_a = request_row.created_by and c.participant_b = new.user_id)
     or (c.participant_b = request_row.created_by and c.participant_a = new.user_id)
  order by c.last_message_at desc nulls last limit 1;

  if conversation_uuid is not null then
    update public.conversations
    set participant_a = request_row.created_by,
        participant_b = new.user_id,
        service_request_id = new.request_id,
        offer_id = new.id,
        booking_id = null,
        last_message = 'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
          ' on "' || coalesce(request_row.title,'Service request') || '"',
        last_message_at = now()
    where id = conversation_uuid;
  else
    insert into public.conversations(
      participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at
    )
    values(
      request_row.created_by,new.user_id,new.request_id,new.id,
      'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
        ' on "' || coalesce(request_row.title,'Service request') || '"',now()
    )
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(
    conversation_uuid,new.user_id,
    'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
      ' on "' || coalesce(request_row.title,'Service request') || '"',
    'request_card',
    jsonb_build_object(
      'kind','offer',
      'title',coalesce(request_row.title,'Service request'),
      'category',request_row.category,
      'location',coalesce(request_row.location,request_row.city),
      'description',request_row.description,
      'amount',new.amount,
      'date',to_char(new.created_at,'DD Mon YYYY'),
      'statusLabel',
        case when lower(coalesce(new.status,'pending'))='accepted'
          then 'Offer accepted'
          else 'Waiting for customer to accept'
        end
    )
  );
  return new;
end; $function$;
