-- Protect suspension and role fields from non-admin profile updates.
create or replace function public.prevent_non_admin_profile_privilege_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.is_suspended is distinct from old.is_suspended then
      raise exception 'Only admins can suspend or unsuspend users';
    end if;

    if new.role is distinct from old.role then
      raise exception 'Only admins can change user roles';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields on public.profiles;

create trigger protect_profile_admin_fields
before update on public.profiles
for each row
execute function public.prevent_non_admin_profile_privilege_changes();

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
