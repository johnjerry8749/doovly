-- Service promotion foundation: admin-controlled packages, IAP-backed promotions, and analytics.
-- Payment activation is performed only by the RevenueCat webhook.

create table if not exists public.promotion_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  product_id text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_promotions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.promotion_packages(id) on delete restrict,
  product_id text not null,
  status text not null default 'pending'
    check (status in ('pending','active','expired','cancelled','refunded')),
  amount numeric(12,2),
  currency text,
  starts_at timestamptz,
  ends_at timestamptz,
  revenuecat_app_user_id text,
  transaction_id text,
  revenuecat_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_promotions_service
  on public.service_promotions(service_id);
create index if not exists idx_service_promotions_user
  on public.service_promotions(user_id);
create index if not exists idx_service_promotions_active
  on public.service_promotions(status, starts_at, ends_at);
create unique index if not exists idx_service_promotions_transaction
  on public.service_promotions(transaction_id)
  where transaction_id is not null;

create table if not exists public.service_promotion_analytics (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.service_promotions(id) on delete cascade,
  metric_date date not null default current_date,
  impressions integer not null default 0,
  service_views integer not null default 0,
  booking_requests integer not null default 0,
  bookings integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (promotion_id, metric_date)
);

create index if not exists idx_promotion_analytics_promotion
  on public.service_promotion_analytics(promotion_id, metric_date);

create trigger promotion_packages_updated_at
  before update on public.promotion_packages
  for each row execute function public.set_updated_at();

create trigger service_promotions_updated_at
  before update on public.service_promotions
  for each row execute function public.set_updated_at();

create trigger service_promotion_analytics_updated_at
  before update on public.service_promotion_analytics
  for each row execute function public.set_updated_at();

alter table public.promotion_packages enable row level security;
alter table public.service_promotions enable row level security;
alter table public.service_promotion_analytics enable row level security;

revoke all on public.promotion_packages from anon;
revoke all on public.service_promotions from anon;
revoke all on public.service_promotion_analytics from anon;

grant select on public.promotion_packages to authenticated;
grant select, insert, update on public.service_promotions to authenticated;
grant select on public.service_promotion_analytics to authenticated;
grant select, insert, update, delete on public.promotion_packages to service_role;
grant select, insert, update, delete on public.service_promotions to service_role;
grant select, insert, update, delete on public.service_promotion_analytics to service_role;

create policy "Authenticated users can view active promotion packages"
on public.promotion_packages
for select
to authenticated
using (active = true or public.is_admin());

create policy "Admins can manage promotion packages"
on public.promotion_packages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can view own promotions and active promotions"
on public.service_promotions
for select
to authenticated
using (
  auth.uid() = user_id
  or (
    status = 'active'
    and starts_at <= now()
    and ends_at > now()
  )
  or public.is_admin()
);

create policy "Users can create pending promotions for their own services"
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
    where s.id = service_id
      and p.id = professional_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can update their own pending promotions"
on public.service_promotions
for update
to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

create policy "Users can view own promotion analytics"
on public.service_promotion_analytics
for select
to authenticated
using (
  exists (
    select 1
    from public.service_promotions sp
    where sp.id = promotion_id
      and (sp.user_id = auth.uid() or public.is_admin())
  )
);

grant select on public.services to authenticated;
