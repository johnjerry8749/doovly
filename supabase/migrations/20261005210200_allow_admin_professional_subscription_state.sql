-- Allow administrators to keep the professionals.subscribed flag in sync
-- when managing subscriptions from the admin dashboard.

create policy "Admins can update professionals"
on public.professionals
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
