-- Keep chat coin display and database message enforcement on the same Pro decision.
-- Explicit admin overrides win over subscriptions and the 30-day trial.
create or replace function public.is_chat_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    case
      when pr.pro_access_override is not null then pr.pro_access_override
      when ps.admin_override is true then
        coalesce(ps.plan_code = 'pro' and lower(coalesce(ps.status, '')) = 'active', false)
      else
        (
          exists (
            select 1
            from public.professionals p
            where p.user_id = p_user_id
              and p.subscribed = true
          )
          or exists (
            select 1
            from public.profiles trial
            where trial.id = p_user_id
              and trial.pro_trial_ends_at is not null
              and trial.pro_trial_ends_at > now()
          )
          or coalesce(ps.plan_code = 'pro' and lower(coalesce(ps.status, '')) = 'active', false)
        )
    end
  from (select 1) seed
  left join public.profiles pr on pr.id = p_user_id
  left join lateral (
    select s.plan_code, s.status, s.admin_override
    from public.professional_subscriptions s
    where s.user_id = p_user_id
    order by s.updated_at desc
    limit 1
  ) ps on true;
$function$;

revoke execute on function public.is_chat_pro(uuid) from public, anon;
grant execute on function public.is_chat_pro(uuid) to authenticated;
