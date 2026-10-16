-- Lock service promotion payment-controlled fields to trusted server processes.
-- Client users may create a pending promotion and cancel their own pending attempt,
-- but cannot set payment metadata, schedule dates, or activate a promotion.

drop policy if exists "Users can update own pending promotions" on public.service_promotions;
drop policy if exists "Users can update their own pending promotions" on public.service_promotions;
drop policy if exists "Owners may cancel own pending promotions" on public.service_promotions;

drop policy if exists "Users can create own pending promotions" on public.service_promotions;
drop policy if exists "Users can create pending promotions for their own services" on public.service_promotions;

-- Remove broad/default grants, including any accidental anon access, then
-- grant only the client operations needed by the app.
revoke all privileges on table public.service_promotions from public, anon, authenticated;

grant select on table public.service_promotions to authenticated;
grant insert (service_id, professional_id, user_id, package_id, product_id)
  on table public.service_promotions to authenticated;
grant update (status)
  on table public.service_promotions to authenticated;

-- Only allow creating a pending promotion for a service owned by the caller,
-- with a currently enabled package and the package's real RevenueCat product ID.
create policy "Users can create own pending promotions"
on public.service_promotions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and exists (
    select 1
    from public.services s
    join public.professionals p on p.id = s.professional_id
    join public.promotion_packages pp
      on pp.id = public.service_promotions.package_id
     and pp.product_id = public.service_promotions.product_id
     and pp.active = true
    where s.id = public.service_promotions.service_id
      and p.id = public.service_promotions.professional_id
      and p.user_id = auth.uid()
  )
);

-- The only permitted client update is cancelling its own pending attempt.
-- The UPDATE column grant allows changing status only; payment fields and
-- activation timestamps remain writable only by trusted server processes.
create policy "Owners may cancel own pending promotions"
on public.service_promotions
for update
to authenticated
using (
  auth.uid() = user_id
  and status = 'pending'
)
with check (
  auth.uid() = user_id
  and status = 'cancelled'
);

-- Keep server-side RevenueCat webhook and expiry scheduler access intact.
grant all privileges on table public.service_promotions to service_role;
