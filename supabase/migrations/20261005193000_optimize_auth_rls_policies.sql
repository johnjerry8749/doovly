create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and not is_suspended
  );
$$;

alter policy "Users can update own profile" on public.profiles using ((select auth.uid()) = id or public.is_admin());

alter policy "Pros can manage own portfolio" on public.portfolio_items
using (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id))
with check (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Authenticated can insert reviews" on public.reviews with check ((select auth.uid()) is not null);

alter policy "Users can view own bookings" on public.bookings
using (public.is_admin() or (select auth.uid()) = customer_id or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Users can create bookings" on public.bookings with check ((select auth.uid()) = customer_id);

alter policy "Users can update own bookings" on public.bookings
using (public.is_admin() or (select auth.uid()) = customer_id or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Authenticated can insert service requests" on public.service_requests with check ((select auth.uid()) is not null);
alter policy "Owners can update service requests" on public.service_requests using ((select auth.uid()) = created_by or public.is_admin());
alter policy "Owners can delete service requests" on public.service_requests using ((select auth.uid()) = created_by or public.is_admin());
alter policy "Authenticated can insert comments" on public.service_request_comments with check ((select auth.uid()) is not null);

alter policy "Involved users can view offers" on public.service_request_offers
using (public.is_admin() or (select auth.uid()) = user_id or (select auth.uid()) in (select created_by from public.service_requests where id = request_id));
alter policy "Users can submit own offers" on public.service_request_offers with check ((select auth.uid()) = user_id);
alter policy "Users can like as themselves" on public.service_request_likes with check ((select auth.uid()) = user_id);
alter policy "Users can unlike themselves" on public.service_request_likes using ((select auth.uid()) = user_id);
alter policy "Users can view own notifications" on public.notifications using ((select auth.uid()) = user_id or public.is_admin());
alter policy "Users can update own notifications" on public.notifications using ((select auth.uid()) = user_id or public.is_admin());
alter policy "Users can manage own saved providers" on public.saved_providers using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "Users can view related verification" on public.verification_applications
using ((select auth.uid()) = user_id or public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Users can view related verification docs" on public.verification_documents
using (public.is_admin() or exists (
  select 1 from public.verification_applications va
  join public.professionals p on p.id = va.professional_id
  where va.id = application_id and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
));

alter policy "Users can view own conversations" on public.conversations
using (public.is_admin() or (select auth.uid()) = participant_a or (select auth.uid()) = participant_b);
alter policy "Users can insert conversations they join" on public.conversations
with check ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);
alter policy "Users manage own conversation reads" on public.conversation_reads
using ((select auth.uid()) = user_id or public.is_admin()) with check ((select auth.uid()) = user_id or public.is_admin());

alter policy "Users can view messages in own conversations" on public.messages
using (public.is_admin() or exists (
  select 1 from public.conversations c
  where c.id = conversation_id and (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
));

alter policy "Users can send messages in own conversations" on public.messages
with check ((select auth.uid()) = sender_id and exists (
  select 1 from public.conversations c
  where c.id = conversation_id and (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
));