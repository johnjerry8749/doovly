-- Remove the legacy mock-ID compatibility layer.
-- This migration is intentionally kept on the cleanup branch until the
-- application and database preview have been verified.

set local lock_timeout = '5s';

-- The auth trigger must stop depending on profiles.mock_id before the column
-- is removed. Normal user accounts do not get a professional row; only
-- accounts explicitly created as professional accounts do.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  next_role text;
  next_city text;
  next_profession text;
  next_phone text;
begin
  next_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');

  if next_role not in ('user', 'admin', 'professional') then
    next_role := 'user';
  end if;

  next_city := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'city'), ''),
    'Lagos'
  );

  next_profession := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'profession'), ''),
    'Other'
  );

  next_phone := coalesce(
    nullif(btrim(new.phone), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  );

  insert into public.profiles (
    id,
    full_name,
    phone,
    email,
    role,
    city,
    profession
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'User'),
    new.phone,
    new.email,
    next_role,
    next_city,
    next_profession
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(
      nullif(excluded.full_name, ''),
      public.profiles.full_name
    ),
    phone = coalesce(excluded.phone, public.profiles.phone),
    city = coalesce(excluded.city, public.profiles.city),
    profession = coalesce(excluded.profession, public.profiles.profession);

  if next_role = 'professional' then
    insert into public.professionals (
      user_id,
      profession,
      city,
      price_from,
      price_from_value,
      email,
      phone
    )
    values (
      new.id,
      next_profession,
      next_city,
      '₦0',
      0,
      new.email,
      next_phone
    )
    on conflict (user_id) do nothing;
  end if;

  insert into public.chat_credits (user_id, remaining)
  values (new.id, 15)
  on conflict (user_id) do nothing;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    unread,
    avatar_url,
    time_label
  )
  values (
    new.id,
    'general',
    'Welcome to Doovly 👋',
    'Thanks for joining Doovly! Explore services and find trusted professionals near you.',
    true,
    null,
    'Just now'
  );

  return new;
end;
$function$;

-- Legacy mock identifiers are no longer part of the application model.
alter table public.profiles drop column if exists mock_id;
alter table public.professionals drop column if exists mock_id;
alter table public.services drop column if exists mock_id;
alter table public.portfolio_items drop column if exists mock_id;
alter table public.reviews drop column if exists mock_id;
alter table public.bookings drop column if exists mock_id;
alter table public.service_requests drop column if exists mock_id;
alter table public.service_request_comments drop column if exists mock_id;
alter table public.service_request_offers drop column if exists mock_id;
alter table public.notifications drop column if exists mock_id;
alter table public.admin_notifications drop column if exists mock_id;
alter table public.service_categories drop column if exists mock_id;
alter table public.subscription_plans drop column if exists mock_id;
alter table public.subscription_plan_features drop column if exists mock_id;
alter table public.professional_subscriptions drop column if exists mock_id;
alter table public.verification_applications drop column if exists mock_id;
alter table public.verification_documents drop column if exists mock_id;
alter table public.conversations drop column if exists mock_id;
alter table public.messages drop column if exists mock_id;
