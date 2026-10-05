-- Allow users to edit and delete only their own service-request comments.

drop policy if exists "Users can update own comments" on public.service_request_comments;
create policy "Users can update own comments"
on public.service_request_comments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own comments" on public.service_request_comments;
create policy "Users can delete own comments"
on public.service_request_comments
for delete
to authenticated
using ((select auth.uid()) = user_id);
