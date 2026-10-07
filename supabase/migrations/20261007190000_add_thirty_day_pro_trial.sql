alter table public.profiles
  add column if not exists pro_trial_started_at timestamptz,
  add column if not exists pro_trial_ends_at timestamptz;

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

  next_city := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'city'), ''), 'Lagos');
  next_profession := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'profession'), ''), 'Other');
  next_phone := coalesce(nullif(btrim(new.phone), ''), nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''));

  insert into public.profiles (
    id, full_name, phone, email, role, city, profession, mock_id,
    pro_trial_started_at, pro_trial_ends_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'User'),
    new.phone,
    new.email,
    next_role,
    next_city,
    next_profession,
    new.raw_user_meta_data ->> 'mock_id',
    now(),
    now() + interval '30 days'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    city = coalesce(excluded.city, public.profiles.city),
    profession = coalesce(excluded.profession, public.profiles.profession);

  if next_role <> 'admin' then
    insert into public.professionals (
      user_id, profession, city, price_from, price_from_value, email, phone
    )
    values (
      new.id, next_profession, next_city, '₦0', 0, new.email, next_phone
    )
    on conflict (user_id) do nothing;
  end if;

  insert into public.chat_credits (user_id, remaining)
  values (new.id, 15)
  on conflict (user_id) do nothing;

  insert into public.notifications (
    user_id, type, title, body, unread, avatar_url, time_label
  )
  values (
    new.id, 'general', 'Welcome to Doovly 👋',
    'Thanks for joining Doovly! Explore services and find trusted professionals near you.',
    true, null, 'Just now'
  );

  return new;
end;
$function$;

create or replace function public.is_chat_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    exists (
      select 1
      from public.professionals p
      where p.user_id = p_user_id
        and p.subscribed = true
    )
    or exists (
      select 1
      from public.profiles pr
      where pr.id = p_user_id
        and pr.pro_trial_ends_at is not null
        and pr.pro_trial_ends_at > now()
    );
$function$;
