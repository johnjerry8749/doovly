-- Keep the official Doovly system account email consistent across Auth,
-- profiles, and database functions that send system chat messages.
do $migration$
declare
  v_user_id uuid;
  v_function record;
  v_definition text;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'system@doovly.app'
  limit 1;

  if v_user_id is not null then
    if exists (
      select 1 from auth.users
      where lower(email) = 'system@doovly.com' and id <> v_user_id
    ) then
      raise exception 'system@doovly.com already belongs to another auth user; no changes made';
    end if;

    update auth.users
    set email = 'system@doovly.com'
    where id = v_user_id;

    update public.profiles
    set email = 'system@doovly.com'
    where id = v_user_id;
  end if;

  for v_function in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) ilike '%system@doovly.app%'
  loop
    v_definition := replace(
      pg_get_functiondef(v_function.oid),
      'system@doovly.app',
      'system@doovly.com'
    );
    execute v_definition;
  end loop;
end;
$migration$;
