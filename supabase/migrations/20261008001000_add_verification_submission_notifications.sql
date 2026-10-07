alter table public.verification_applications
  add column if not exists submitted_at timestamptz,
  add column if not exists admin_notified_at timestamptz;

create index if not exists idx_verification_apps_status_created
  on public.verification_applications (status, created_at desc);

create index if not exists idx_verification_docs_application_title
  on public.verification_documents (application_id, title);

drop policy if exists "Users can create verification applications" on public.verification_applications;
create policy "Users can create verification applications"
on public.verification_applications
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.professionals p
    where p.id = professional_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own verification applications" on public.verification_applications;
create policy "Users can update own verification applications"
on public.verification_applications
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and status in ('pending','rejected')
)
with check (
  (select auth.uid()) = user_id
  and status in ('pending','rejected')
);

drop policy if exists "Users can create verification documents" on public.verification_documents;
create policy "Users can create verification documents"
on public.verification_documents
for insert
to authenticated
with check (
  exists (
    select 1 from public.verification_applications va
    join public.professionals p on p.id = va.professional_id
    where va.id = application_id
      and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
  )
);

drop policy if exists "Users can update verification documents" on public.verification_documents;
create policy "Users can update verification documents"
on public.verification_documents
for update
to authenticated
using (
  exists (
    select 1 from public.verification_applications va
    join public.professionals p on p.id = va.professional_id
    where va.id = application_id
      and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.verification_applications va
    join public.professionals p on p.id = va.professional_id
    where va.id = application_id
      and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
  )
);
