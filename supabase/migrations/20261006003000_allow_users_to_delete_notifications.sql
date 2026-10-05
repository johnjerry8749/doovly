-- Allow authenticated users to delete only their own notifications.
create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);
