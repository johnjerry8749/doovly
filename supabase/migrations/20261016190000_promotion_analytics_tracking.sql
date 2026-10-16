-- Reliable promotion analytics events and booking attribution.
alter table public.bookings
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists promotion_id uuid references public.service_promotions(id) on delete set null;

create index if not exists idx_bookings_promotion_id on public.bookings(promotion_id);

create or replace function public.track_service_promotion_event(
  p_service_id uuid,
  p_metric text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion_id uuid;
  v_column text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_metric not in ('impressions', 'service_views') then
    raise exception 'Unsupported promotion metric';
  end if;

  select sp.id into v_promotion_id
  from public.service_promotions sp
  where sp.service_id = p_service_id
    and sp.status = 'active'
    and sp.starts_at <= now()
    and sp.ends_at > now()
  order by sp.ends_at desc
  limit 1;

  if v_promotion_id is null then
    return;
  end if;

  insert into public.service_promotion_analytics (promotion_id, metric_date)
  values (v_promotion_id, current_date)
  on conflict (promotion_id, metric_date) do nothing;

  v_column := p_metric;
  execute format(
    'update public.service_promotion_analytics set %I = %I + 1, updated_at = now() where promotion_id = $1 and metric_date = current_date',
    v_column, v_column
  ) using v_promotion_id;
end;
$$;

revoke all on function public.track_service_promotion_event(uuid, text) from public, anon;
grant execute on function public.track_service_promotion_event(uuid, text) to authenticated;

create or replace function public.attribute_booking_to_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion_id uuid;
begin
  if new.service_id is null then
    return new;
  end if;

  if new.promotion_id is null then
    select sp.id into v_promotion_id
    from public.service_promotions sp
    where sp.service_id = new.service_id
      and sp.status = 'active'
      and sp.starts_at <= now()
      and sp.ends_at > now()
    order by sp.ends_at desc
    limit 1;
    new.promotion_id := v_promotion_id;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_attribute_promotion on public.bookings;
create trigger bookings_attribute_promotion
before insert on public.bookings
for each row execute function public.attribute_booking_to_promotion();

create or replace function public.record_promotion_booking_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion_id uuid;
begin
  v_promotion_id := new.promotion_id;
  if tg_op = 'UPDATE' and v_promotion_id is null then
    v_promotion_id := old.promotion_id;
  end if;

  if v_promotion_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if lower(coalesce(new.status, '')) in ('pending', 'accepted') then
      insert into public.service_promotion_analytics (promotion_id, metric_date, booking_requests)
      values (v_promotion_id, current_date, 1)
      on conflict (promotion_id, metric_date)
      do update set booking_requests = public.service_promotion_analytics.booking_requests + 1,
                    updated_at = now();
    end if;

    if lower(coalesce(new.status, '')) = 'accepted' then
      insert into public.service_promotion_analytics (promotion_id, metric_date, bookings)
      values (v_promotion_id, current_date, 1)
      on conflict (promotion_id, metric_date)
      do update set bookings = public.service_promotion_analytics.bookings + 1,
                    updated_at = now();
    end if;
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.status, '')) <> 'accepted'
    and lower(coalesce(new.status, '')) = 'accepted' then
    insert into public.service_promotion_analytics (promotion_id, metric_date, bookings)
    values (v_promotion_id, current_date, 1)
    on conflict (promotion_id, metric_date)
    do update set bookings = public.service_promotion_analytics.bookings + 1,
                  updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_record_promotion_metrics on public.bookings;
drop trigger if exists bookings_record_promotion_insert_metrics on public.bookings;
drop trigger if exists bookings_record_promotion_update_metrics on public.bookings;
create trigger bookings_record_promotion_insert_metrics
after insert on public.bookings
for each row execute function public.record_promotion_booking_metrics();
create trigger bookings_record_promotion_update_metrics
after update of status on public.bookings
for each row execute function public.record_promotion_booking_metrics();

grant select on public.service_promotions to authenticated;
