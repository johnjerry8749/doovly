-- Keep service-request like counts live in the app.
-- likes_count is maintained by the existing likes trigger; publishing
-- service_requests UPDATE lets open request feeds receive the new count
-- immediately when another user likes/unlikes a request.

alter publication supabase_realtime add table public.service_requests;
