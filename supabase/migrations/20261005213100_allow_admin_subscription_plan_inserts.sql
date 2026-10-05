create policy "Admins can insert subscription plans"
on public.subscription_plans
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can insert plan meta"
on public.subscription_plan_meta
for insert
to authenticated
with check ((select public.is_admin()));
