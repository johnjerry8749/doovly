-- Allow authenticated owners to manage professional profiles and their services.
-- Safe to run after the existing public-read policies.

create policy "Professionals can update own professional profile"
on public.professionals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Professionals can insert own professional profile"
on public.professionals
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Professionals can delete own professional profile"
on public.professionals
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Professionals can manage own services"
on public.services
for all
to authenticated
using (
  exists (
    select 1
    from public.professionals p
    where p.id = professional_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.professionals p
    where p.id = professional_id
      and p.user_id = (select auth.uid())
  )
);


-- Track the exact offer represented by an offer chat.
alter table public.conversations
  add column if not exists offer_id uuid references public.service_request_offers(id) on delete set null;

create index if not exists conversations_offer_id_idx
  on public.conversations(offer_id);
