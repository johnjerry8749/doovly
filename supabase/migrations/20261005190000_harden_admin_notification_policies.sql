-- Admin notification RLS hardening
drop policy if exists "Admins can send broadcasts" on public.admin_notifications;
create policy "Admins can send broadcasts"
on public.admin_notifications
for insert
to authenticated
with check (is_admin());

drop policy if exists "Admins can view broadcast history" on public.admin_notifications;
create policy "Admins can view broadcast history"
on public.admin_notifications
for select
to authenticated
using (is_admin());

drop policy if exists "Admins can create user notifications" on public.notifications;
create policy "Admins can create user notifications"
on public.notifications
for insert
to authenticated
with check (is_admin());
