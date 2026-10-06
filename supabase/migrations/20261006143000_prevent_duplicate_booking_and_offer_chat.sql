-- Prevent duplicate booking orders and make offers follow the same chat-card flow.
alter table public.bookings
  add column if not exists source_offer_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_source_offer_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_source_offer_id_fkey
      foreign key (source_offer_id)
      references public.service_request_offers(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists bookings_source_offer_id_unique
  on public.bookings(source_offer_id) where source_offer_id is not null;

create unique index if not exists conversations_offer_id_unique
  on public.conversations(offer_id) where offer_id is not null;

create or replace function public.prevent_duplicate_booking_order()
returns trigger
language plpgsql
as $function$
declare existing_booking public.bookings;
begin
  select b.* into existing_booking
  from public.bookings b
  where b.customer_id = new.customer_id
    and b.professional_id = new.professional_id
    and lower(coalesce(b.title,'')) = lower(coalesce(new.title,''))
    and coalesce(b.amount,0) = coalesce(new.amount,0)
    and lower(coalesce(b.location,'')) = lower(coalesce(new.location,''))
    and lower(coalesce(b.status,'pending')) in ('pending','accepted')
  order by b.created_at desc limit 1;
  if existing_booking.id is not null then return existing_booking; end if;
  return new;
end;
$function$;

drop trigger if exists trg_prevent_duplicate_booking_order on public.bookings;
create trigger trg_prevent_duplicate_booking_order
before insert on public.bookings
for each row execute function public.prevent_duplicate_booking_order();

create or replace function public.create_offer_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare request_row record; conversation_uuid uuid;
begin
  select r.created_by,r.title,r.category,r.location,r.city,r.description
    into request_row from public.service_requests r where r.id=new.request_id;

  if request_row.created_by is null or new.user_id is null
     or request_row.created_by=new.user_id then return new; end if;

  insert into public.conversations
    (participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at)
  values
    (request_row.created_by,new.user_id,new.request_id,new.id,
     'Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||
     ' on "'||coalesce(request_row.title,'Service request')||'"',now())
  on conflict (offer_id) do update
    set last_message=excluded.last_message,last_message_at=excluded.last_message_at
  returning id into conversation_uuid;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  select conversation_uuid,new.user_id,
    'Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||
    ' on "'||coalesce(request_row.title,'Service request')||'"',
    'request_card',
    jsonb_build_object(
      'kind','offer','title',coalesce(request_row.title,'Service request'),
      'category',request_row.category,'location',coalesce(request_row.location,request_row.city),
      'description',request_row.description,'amount',new.amount,
      'date',to_char(now(),'DD Mon YYYY'),
      'statusLabel','Waiting for customer to accept')
  where not exists(
    select 1 from public.messages m
    where m.conversation_id=conversation_uuid and m.kind='request_card');

  return new;
end;
$function$;

drop trigger if exists trg_create_offer_conversation on public.service_request_offers;
create trigger trg_create_offer_conversation
after insert on public.service_request_offers
for each row execute function public.create_offer_conversation();

revoke execute on function public.create_offer_conversation() from public,anon,authenticated;

drop policy if exists "Users can send messages in own conversations" on public.messages;
create policy "Users can send messages in own conversations"
on public.messages for insert to authenticated
with check (
  (select auth.uid())=sender_id
  and exists(
    select 1 from public.conversations c
    where c.id=messages.conversation_id
      and (c.participant_a=(select auth.uid()) or c.participant_b=(select auth.uid()))
      and (
        messages.kind <> 'location'
        or (
          c.booking_id is not null and exists(
            select 1 from public.bookings b
            where b.id=c.booking_id
              and lower(coalesce(b.status,'pending'))='accepted')
        )
        or (
          c.offer_id is not null and exists(
            select 1 from public.service_request_offers o
            where o.id=c.offer_id
              and lower(coalesce(o.status,'pending'))='accepted')
        )
      )
  )
);

insert into public.conversations
  (participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at)
select r.created_by,o.user_id,o.request_id,o.id,
  'Offer: ₦'||to_char(o.amount,'FM999,999,999,990')||
  ' on "'||coalesce(r.title,'Service request')||'"',now()
from public.service_request_offers o
join public.service_requests r on r.id=o.request_id
where not exists(select 1 from public.conversations c where c.offer_id=o.id)
  and r.created_by is not null and o.user_id is not null and r.created_by<>o.user_id;

insert into public.messages(conversation_id,sender_id,text,kind,card)
select c.id,o.user_id,
  'Offer: ₦'||to_char(o.amount,'FM999,999,999,990')||
  ' on "'||coalesce(r.title,'Service request')||'"',
  'request_card',
  jsonb_build_object(
    'kind','offer','title',coalesce(r.title,'Service request'),
    'category',r.category,'location',coalesce(r.location,r.city),
    'description',r.description,'amount',o.amount,
    'date',to_char(o.created_at,'DD Mon YYYY'),
    'statusLabel',case lower(coalesce(o.status,'pending'))
      when 'accepted' then 'Offer accepted'
      when 'declined' then 'Offer declined'
      else 'Waiting for customer to accept' end)
from public.service_request_offers o
join public.service_requests r on r.id=o.request_id
join public.conversations c on c.offer_id=o.id
where not exists(
  select 1 from public.messages m
  where m.conversation_id=c.id and m.kind='request_card');
