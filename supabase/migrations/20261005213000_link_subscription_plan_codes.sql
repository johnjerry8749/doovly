-- Use stable database plan/feature codes instead of client mock IDs.
alter table public.subscription_plans add column if not exists code text;
alter table public.subscription_plan_features add column if not exists code text;

update public.subscription_plans
set code = lower(coalesce(code, mock_id))
where code is null or btrim(code) = '';

update public.subscription_plan_features
set code = coalesce(code, mock_id)
where code is null or btrim(code) = '';

create unique index if not exists subscription_plans_code_key
on public.subscription_plans(code);

create unique index if not exists subscription_plan_features_plan_code_key
on public.subscription_plan_features(plan_id, code);

alter table public.subscription_plans alter column code set not null;
alter table public.subscription_plan_features alter column code set not null;

alter publication supabase_realtime add table public.subscription_plans;
alter publication supabase_realtime add table public.subscription_plan_features;
alter publication supabase_realtime add table public.subscription_plan_meta;
