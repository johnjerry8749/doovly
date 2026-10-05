-- Allow admins to manage professional subscription records.
drop policy if exists "Admins can manage professional subscriptions" on public.professional_subscriptions;

create policy "Admins can manage professional subscriptions"
on public.professional_subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
