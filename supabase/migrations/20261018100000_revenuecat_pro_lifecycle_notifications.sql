-- RevenueCat Pro lifecycle notifications: 3-day reminder and one-time expiry delivery.
alter table public.professional_subscriptions
  add column if not exists expiry_reminder_sent_at timestamptz,
  add column if not exists expiry_notified_at timestamptz;

create table if not exists public.revenuecat_pro_event_receipts (
  event_id text primary key,
  user_id uuid,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.revenuecat_pro_event_receipts enable row level security;
revoke all on public.revenuecat_pro_event_receipts from anon, authenticated;
grant all on public.revenuecat_pro_event_receipts to service_role;

create index if not exists professional_subscriptions_pro_expiry_reminder_idx
  on public.professional_subscriptions (end_date)
  where plan_code = 'pro' and status = 'active' and expiry_reminder_sent_at is null;

create or replace function public.send_pro_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sub record;
  system_user_id uuid;
  conversation_id uuid;
  n integer := 0;
  message_text text;
begin
  select id into system_user_id
  from public.profiles
  where lower(email) = 'system@doovly.app'
  limit 1;

  for sub in
    select ps.id, ps.user_id, ps.professional_id, ps.end_date,
           p.full_name
    from public.professional_subscriptions ps
    left join public.profiles p on p.id = ps.user_id
    where ps.user_id is not null
      and ps.plan_code = 'pro'
      and ps.status = 'active'
      and ps.admin_override = false
      and ps.end_date = current_date + 3
      and ps.expiry_reminder_sent_at is null
    order by ps.end_date
    for update of ps skip locked
  loop
    message_text := 'Your Doovly Pro subscription expires in 3 days (' ||
      to_char(sub.end_date, 'DD Mon YYYY') ||
      '). Renew before it expires to keep your Pro benefits, including unlimited chat coins.';

    insert into public.notifications(user_id, type, title, body, unread, data)
    values (
      sub.user_id, 'general', 'Pro expires in 3 days', message_text, true,
      jsonb_build_object('type','pro_expiry_reminder','screen','subscription','subscription_id',sub.id)
    );

    if system_user_id is not null then
      conversation_id := null;
      select c.id into conversation_id
      from public.conversations c
      where (c.participant_a = sub.user_id and c.participant_b = system_user_id)
         or (c.participant_a = system_user_id and c.participant_b = sub.user_id)
      order by c.created_at desc limit 1;

      if conversation_id is null then
        insert into public.conversations(participant_a, participant_b, last_message, last_message_at)
        values (sub.user_id, system_user_id, message_text, now())
        returning id into conversation_id;
      end if;

      insert into public.messages(conversation_id, sender_id, text, kind)
      values (conversation_id, system_user_id, message_text, 'system');

      update public.conversations
      set last_message = message_text, last_message_at = now()
      where id = conversation_id;

      insert into public.conversation_reads(conversation_id, user_id, unread_count, last_read_at)
      values (conversation_id, sub.user_id, 1, null)
      on conflict (conversation_id, user_id)
      do update set unread_count = public.conversation_reads.unread_count + 1;
    end if;

    update public.professional_subscriptions
    set expiry_reminder_sent_at = now(), updated_at = now()
    where id = sub.id and expiry_reminder_sent_at is null;

    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function public.send_pro_expiry_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-pro-expiry-reminders') then
    perform cron.unschedule('send-pro-expiry-reminders');
  end if;
  perform cron.schedule(
    'send-pro-expiry-reminders',
    '0 9 * * *',
    'select public.send_pro_expiry_reminders();'
  );
end
$$;
