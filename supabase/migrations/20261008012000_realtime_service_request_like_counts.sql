-- Keep service-request like counts live in the app.
-- likes_count is maintained by the existing likes trigger; publishing
-- service_requests UPDATE lets open request feeds receive the new count
-- immediately when another user likes/unlikes a request.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_requests'
  ) then
    alter publication supabase_realtime add table public.service_requests;
  end if;
end
$$;
