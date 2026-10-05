create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_user uuid;
begin
  select p.user_id into target_user from public.professionals p where p.id = new.professional_id;
  if target_user is not null then
    insert into public.notifications (user_id,type,title,body,unread)
    values (target_user,'booking','New Booking Request','You have received a new booking request.',true);
  end if;
  return new;
end; $$;

create or replace function public.notify_offer_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_user uuid;
begin
  select sr.created_by into target_user from public.service_requests sr where sr.id = new.request_id;
  if target_user is not null and target_user <> new.user_id then
    insert into public.notifications (user_id,type,title,body,unread)
    values (target_user,'general','New Offer','Someone sent an offer of ₦' || to_char(new.amount,'FM999,999,999,990') || ' on your service request.',true);
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_booking_created on public.bookings;
create trigger trg_notify_booking_created after insert on public.bookings for each row execute function public.notify_booking_created();
drop trigger if exists trg_notify_offer_created on public.service_request_offers;
create trigger trg_notify_offer_created after insert on public.service_request_offers for each row execute function public.notify_offer_created();
revoke execute on function public.notify_booking_created() from anon, authenticated;
revoke execute on function public.notify_offer_created() from anon, authenticated;
grant execute on function public.notify_booking_created() to service_role;
grant execute on function public.notify_offer_created() to service_role;