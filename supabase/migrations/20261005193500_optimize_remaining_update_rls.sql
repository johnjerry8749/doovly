alter policy "Users can update own conversations" on public.conversations
using ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);

alter policy "Request owners can update offers" on public.service_request_offers
using ((select auth.uid()) in (select created_by from public.service_requests where id = request_id));