-- Keep professional subscription state synchronized with frontend clients in real time.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'professionals'
  ) then
    alter publication supabase_realtime add table public.professionals;
  end if;
end
$$;
