create or replace function public.sync_service_request_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  v_request_id := coalesce(NEW.request_id, OLD.request_id);

  update public.service_requests
  set likes_count = (
    select count(*)::integer
    from public.service_request_likes
    where request_id = v_request_id
  )
  where id = v_request_id;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_sync_service_request_likes_count on public.service_request_likes;

create trigger trg_sync_service_request_likes_count
after insert or delete on public.service_request_likes
for each row
execute function public.sync_service_request_likes_count();

update public.service_requests r
set likes_count = (
  select count(*)::integer
  from public.service_request_likes l
  where l.request_id = r.id
);