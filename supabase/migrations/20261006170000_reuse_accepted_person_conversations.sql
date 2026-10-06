-- Reuse the existing accepted relationship conversation for repeat bookings/offers.
-- Repeat work with the same person continues in the same chat instead of
-- creating a second conversation with Accept/Decline controls.

alter table public.service_request_offers
  drop constraint if exists service_request_offers_request_id_user_id_key;

create or replace function public.prevent_duplicate_booking_order()
returns trigger language plpgsql as $function$
declare existing_booking public.bookings; professional_user uuid;
begin
  select b.* into existing_booking from public.bookings b
  where b.customer_id=new.customer_id and b.professional_id=new.professional_id
    and lower(coalesce(b.title,''))=lower(coalesce(new.title,''))
    and coalesce(b.amount,0)=coalesce(new.amount,0)
    and lower(coalesce(b.location,''))=lower(coalesce(new.location,''))
    and lower(coalesce(b.status,'pending')) in ('pending','accepted')
  order by b.created_at desc limit 1;
  if existing_booking.id is not null then return existing_booking; end if;

  select p.user_id into professional_user from public.professionals p where p.id=new.professional_id;
  if professional_user is not null and exists (
    select 1 from public.conversations c
    where ((c.participant_a=new.customer_id and c.participant_b=professional_user)
       or (c.participant_b=new.customer_id and c.participant_a=professional_user))
      and (exists(select 1 from public.bookings b where b.id=c.booking_id and lower(coalesce(b.status,'pending'))='accepted')
       or exists(select 1 from public.service_request_offers o where o.id=c.offer_id and lower(coalesce(o.status,'pending'))='accepted'))
  ) then new.status:='accepted'; end if;
  return new;
end; $function$;

create or replace function public.create_booking_conversation()
returns trigger language plpgsql security definer set search_path=public as $function$
declare professional_user uuid; conversation_uuid uuid; existing_conversation uuid;
begin
  select p.user_id into professional_user from public.professionals p where p.id=new.professional_id;
  if professional_user is null or professional_user=new.customer_id then return new; end if;

  select c.id into existing_conversation from public.conversations c
  where ((c.participant_a=new.customer_id and c.participant_b=professional_user)
      or (c.participant_b=new.customer_id and c.participant_a=professional_user))
    and (exists(select 1 from public.bookings b where b.id=c.booking_id and b.id<>new.id and lower(coalesce(b.status,'pending'))='accepted')
      or exists(select 1 from public.service_request_offers o where o.id=c.offer_id and lower(coalesce(o.status,'pending'))='accepted'))
  order by c.last_message_at desc nulls last limit 1;

  if existing_conversation is not null and lower(coalesce(new.status,'pending'))='accepted' then
    update public.conversations set booking_id=new.id,service_request_id=null,offer_id=null,
      last_message='Booking: '||coalesce(new.title,new.service_name,'Booking'),last_message_at=now()
    where id=existing_conversation returning id into conversation_uuid;
  else
    insert into public.conversations(participant_a,participant_b,booking_id,last_message,last_message_at)
    values(new.customer_id,professional_user,new.id,'Booking request: '||coalesce(new.title,new.service_name,'Booking'),now())
    on conflict (booking_id) where booking_id is not null do update
      set last_message=excluded.last_message,last_message_at=excluded.last_message_at
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(conversation_uuid,new.customer_id,
    case when lower(coalesce(new.status,'pending'))='accepted' then 'Booking: ' else 'Booking request: ' end||coalesce(new.title,new.service_name,'Booking'),
    'request_card',jsonb_build_object('kind','booking','title',coalesce(new.title,new.service_name,'Booking'),
      'category',new.service_name,'location',coalesce(new.location,new.address),'description',new.notes,'amount',coalesce(new.amount,0),
      'date',new.display_date,'statusLabel',case lower(coalesce(new.status,'pending')) when 'pending' then 'Waiting for professional to accept'
        when 'declined' then 'This booking was declined' when 'cancelled' then 'This booking was declined' else 'Accepted' end));
  return new;
end; $function$;

create or replace function public.create_offer_conversation()
returns trigger language plpgsql security definer set search_path=public as $function$
declare request_row record; conversation_uuid uuid; existing_conversation uuid;
  customer_name text; professional_name text; new_booking_id uuid;
begin
  select r.created_by,r.title,r.category,r.location,r.city,r.description into request_row
  from public.service_requests r where r.id=new.request_id;
  if request_row.created_by is null or new.user_id is null or request_row.created_by=new.user_id then return new; end if;

  select c.id into existing_conversation from public.conversations c
  where ((c.participant_a=request_row.created_by and c.participant_b=new.user_id)
      or (c.participant_b=request_row.created_by and c.participant_a=new.user_id))
    and (exists(select 1 from public.bookings b where b.id=c.booking_id and lower(coalesce(b.status,'pending'))='accepted')
      or exists(select 1 from public.service_request_offers o where o.id=c.offer_id and o.id<>new.id and lower(coalesce(o.status,'pending'))='accepted'))
  order by c.last_message_at desc nulls last limit 1;

  if existing_conversation is not null then
    update public.service_request_offers set status='accepted' where id=new.id and lower(coalesce(status,'pending'))='pending';
    update public.conversations set participant_a=request_row.created_by,participant_b=new.user_id,
      service_request_id=new.request_id,offer_id=new.id,booking_id=null,
      last_message='Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||' on "'||coalesce(request_row.title,'Service request')||'"',last_message_at=now()
    where id=existing_conversation returning id into conversation_uuid;

    select full_name into customer_name from public.profiles where id=request_row.created_by;
    select coalesce(pr.full_name,'Professional') into professional_name
    from public.professionals p left join public.profiles pr on pr.id=p.user_id where p.id=new.professional_id;

    insert into public.bookings(customer_id,professional_id,title,professional_name,customer_name,status,amount,location,display_date,rating,reviews_count,source_offer_id)
    values(request_row.created_by,new.professional_id,coalesce(request_row.title,'Service request'),coalesce(professional_name,'Professional'),
      coalesce(customer_name,'Customer'),'accepted',new.amount,coalesce(request_row.location,request_row.city,'Nigeria'),
      to_char(now(),'DD Mon YYYY'),5,0,new.id)
    on conflict (source_offer_id) where source_offer_id is not null do nothing
    returning id into new_booking_id;

    if new_booking_id is not null then
      update public.conversations set booking_id=new_booking_id,service_request_id=null,offer_id=null where id=conversation_uuid;
    end if;
  else
    insert into public.conversations(participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at)
    values(request_row.created_by,new.user_id,new.request_id,new.id,
      'Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||' on "'||coalesce(request_row.title,'Service request')||'"',now())
    on conflict (offer_id) where offer_id is not null do update
      set last_message=excluded.last_message,last_message_at=excluded.last_message_at
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(conversation_uuid,new.user_id,
    'Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||' on "'||coalesce(request_row.title,'Service request')||'"',
    'request_card',jsonb_build_object('kind','offer','title',coalesce(request_row.title,'Service request'),
      'category',request_row.category,'location',coalesce(request_row.location,request_row.city),
      'description',request_row.description,'amount',new.amount,'date',to_char(new.created_at,'DD Mon YYYY'),
      'statusLabel',case when lower(coalesce(new.status,'pending'))='accepted' then 'Offer accepted'
        else 'Waiting for customer to accept' end));
  return new;
end; $function$;

drop trigger if exists trg_prevent_duplicate_booking_order on public.bookings;
create trigger trg_prevent_duplicate_booking_order before insert on public.bookings
for each row execute function public.prevent_duplicate_booking_order();

drop trigger if exists trg_create_booking_conversation on public.bookings;
create trigger trg_create_booking_conversation after insert on public.bookings
for each row execute function public.create_booking_conversation();

drop trigger if exists trg_create_offer_conversation on public.service_request_offers;
create trigger trg_create_offer_conversation after insert on public.service_request_offers
for each row execute function public.create_offer_conversation();
