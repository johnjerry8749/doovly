-- Harden RevenueCat webhook idempotency and public SECURITY DEFINER access.
-- Existing receipts represent completed events; new events use explicit claim state.

alter table public.revenuecat_pro_event_receipts
  add column if not exists processing_status text not null default 'processed',
  add column if not exists processing_started_at timestamptz,
  add column if not exists last_error text;

alter table public.revenuecat_pro_event_receipts
  alter column processed_at drop not null,
  alter column processed_at drop default;

update public.revenuecat_pro_event_receipts
set processing_status = 'processed',
    processed_at = coalesce(processed_at, now()),
    processing_started_at = null,
    last_error = null
where processing_status is distinct from 'processed';

create index if not exists revenuecat_pro_receipts_status_started_idx
  on public.revenuecat_pro_event_receipts (processing_status, processing_started_at);

create unique index if not exists service_promotions_transaction_id_uidx
  on public.service_promotions (transaction_id)
  where transaction_id is not null;

create unique index if not exists service_promotions_revenuecat_event_id_uidx
  on public.service_promotions (revenuecat_event_id)
  where revenuecat_event_id is not null and revenuecat_event_id <> '';

create unique index if not exists notifications_revenuecat_event_uidx
  on public.notifications (user_id, (data ->> 'revenuecat_event_id'))
  where data ? 'revenuecat_event_id' and data ->> 'revenuecat_event_id' is not null;

create unique index if not exists messages_revenuecat_event_uidx
  on public.messages ((card ->> 'revenuecat_event_id'))
  where card ->> 'revenuecat_event_id' is not null;

create or replace function public.claim_revenuecat_pro_event(
  p_event_id text,
  p_user_id uuid,
  p_event_type text
)
returns boolean
language sql
security definer
set search_path = ''
as $function$
  with claimed as (
    insert into public.revenuecat_pro_event_receipts as existing (
      event_id, user_id, event_type, processing_status,
      processing_started_at, processed_at, last_error
    )
    values (p_event_id, p_user_id, p_event_type, 'processing', now(), null, null)
    on conflict (event_id) do update
      set user_id = excluded.user_id,
          event_type = excluded.event_type,
          processing_status = 'processing',
          processing_started_at = now(),
          processed_at = null,
          last_error = null
      where existing.processing_status <> 'processed'
        and (
          existing.processing_status = 'failed'
          or existing.processing_started_at is null
          or existing.processing_started_at < now() - interval '5 minutes'
        )
    returning event_id
  )
  select exists (select 1 from claimed);
$function$;

-- The event claim endpoint is private to the service-role webhook.
revoke all on function public.claim_revenuecat_pro_event(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_revenuecat_pro_event(text, uuid, text)
  to service_role;

-- Remove default API execution from SECURITY DEFINER functions. Keep service_role
-- access for trusted backend workflows and grant app RPCs only to signed-in users.
do $function$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      fn.signature
    );
    execute format(
      'grant execute on function %s to service_role',
      fn.signature
    );
  end loop;
end;
$function$;

-- is_admin() is used by RLS policies that intentionally apply to PUBLIC reads.
-- It is safe for anon: auth.uid() is NULL and the function returns false.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_my_chat_credits() to authenticated;
grant execute on function public.get_my_chat_pro() to authenticated;
grant execute on function public.increment_conversation_unread(uuid) to authenticated;
grant execute on function public.allow_conversation_text(uuid) to authenticated;
grant execute on function public.track_service_promotion_event(uuid, text) to authenticated;

-- Every application object referenced by this trigger is schema-qualified.
alter function public.prevent_duplicate_booking_order()
  set search_path = '';
