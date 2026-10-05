alter table public.profiles
  add column if not exists expo_push_token text;

create index if not exists profiles_expo_push_token_idx
  on public.profiles (expo_push_token)
  where expo_push_token is not null;

create or replace function public.send_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
  payload jsonb;
begin
  select p.expo_push_token into token
  from public.profiles p
  where p.id = new.user_id
    and p.expo_push_token is not null
    and length(trim(p.expo_push_token)) > 0
  limit 1;

  if token is null then
    return new;
  end if;

  payload := jsonb_build_object(
    'to', token,
    'title', coalesce(new.title, 'Doovly'),
    'body', coalesce(new.body, ''),
    'sound', 'default',
    'data', coalesce(new.data, jsonb_build_object('notificationId', new.id::text)),
    'priority', 'high'
  );

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := payload
  );

  return new;
exception when others then
  raise warning '[push notification] %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notifications_send_push on public.notifications;

create trigger notifications_send_push
after insert on public.notifications
for each row
execute function public.send_notification_push();

revoke all on function public.send_notification_push() from public, anon, authenticated;
grant execute on function public.send_notification_push() to postgres;
