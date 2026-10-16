-- Automatically end expired promotions and post a one-time results summary to Doovly chat.
create extension if not exists pg_cron with schema pg_catalog;

alter table public.service_promotions
  add column if not exists end_notified_at timestamptz;

create index if not exists idx_service_promotions_due_to_end
  on public.service_promotions(status, ends_at)
  where status in ('active', 'expired');

create or replace function public.finish_expired_service_promotions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p record;
  v_system_user_id uuid;
  v_conversation_id uuid;
  v_impressions bigint;
  v_views bigint;
  v_requests bigint;
  v_bookings bigint;
  v_message text;
  v_count integer := 0;
begin
  select id into v_system_user_id
  from public.profiles
  where lower(email) = 'system@doovly.app'
  limit 1;

  -- If the Doovly system profile is not available yet, do not mark messages
  -- as delivered; a later scheduled run can retry the chat delivery.
  for p in
    select sp.id, sp.user_id, sp.service_id, sp.ends_at, sp.status, s.name as service_name
    from public.service_promotions sp
    left join public.services s on s.id = sp.service_id
    where sp.ends_at <= now()
      and (
        sp.status = 'active'
        or (sp.status = 'expired' and sp.end_notified_at is null)
      )
    order by sp.ends_at
    for update of sp skip locked
  loop
    if p.status is distinct from 'expired' then
      update public.service_promotions
      set status = 'expired', updated_at = now()
      where id = p.id and status = 'active';
    end if;

    if v_system_user_id is null then
      continue;
    end if;

    select
      coalesce(sum(a.impressions), 0),
      coalesce(sum(a.service_views), 0),
      coalesce(sum(a.booking_requests), 0),
      coalesce(sum(a.bookings), 0)
    into v_impressions, v_views, v_requests, v_bookings
    from public.service_promotion_analytics a
    where a.promotion_id = p.id;

    select c.id into v_conversation_id
    from public.conversations c
    where (c.participant_a = p.user_id and c.participant_b = v_system_user_id)
       or (c.participant_a = v_system_user_id and c.participant_b = p.user_id)
    order by c.created_at desc
    limit 1;

    if v_conversation_id is null then
      insert into public.conversations (
        participant_a, participant_b, last_message, last_message_at
      ) values (
        p.user_id, v_system_user_id,
        'Your promotion has ended. Your final results are ready.',
        now()
      )
      returning id into v_conversation_id;
    end if;

    v_message :=
      'Promotion ended — "' || coalesce(nullif(p.service_name, ''), 'Your service') ||
      '" has finished its promotion period.' || E'\n\n' ||
      'Final results:' || E'\n' ||
      '• Impressions: ' || v_impressions || E'\n' ||
      '• Service views: ' || v_views || E'\n' ||
      '• Booking requests: ' || v_requests || E'\n' ||
      '• Confirmed bookings: ' || v_bookings || E'\n\n' ||
      'The promotion is no longer active. You can promote this service again whenever you are ready.';

    insert into public.messages (conversation_id, sender_id, text, kind)
    values (v_conversation_id, v_system_user_id, v_message, 'system');

    update public.conversations
    set last_message = 'Promotion ended — final results are ready.',
        last_message_at = now()
    where id = v_conversation_id;

    insert into public.conversation_reads (
      conversation_id, user_id, unread_count, last_read_at
    ) values (
      v_conversation_id, p.user_id, 1, null
    )
    on conflict (conversation_id, user_id)
    do update set unread_count = public.conversation_reads.unread_count + 1;

    insert into public.notifications (
      user_id, type, title, body, unread, data
    ) values (
      p.user_id,
      'general',
      'Promotion ended',
      '"' || coalesce(nullif(p.service_name, ''), 'Your service') ||
      '" promotion has ended. Open Doovly chat to see your final results.',
      true,
      jsonb_build_object(
        'type', 'promotion_ended',
        'screen', 'chat',
        'promotion_id', p.id,
        'impressions', v_impressions,
        'service_views', v_views,
        'booking_requests', v_requests,
        'bookings', v_bookings
      )
    );

    update public.service_promotions
    set end_notified_at = now(), updated_at = now()
    where id = p.id and end_notified_at is null;

    v_count := v_count + 1;
    v_conversation_id := null;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.finish_expired_service_promotions() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'finish-expired-service-promotions') then
    perform cron.unschedule('finish-expired-service-promotions');
  end if;
  perform cron.schedule(
    'finish-expired-service-promotions',
    '* * * * *',
    'select public.finish_expired_service_promotions();'
  );
end
$$;
