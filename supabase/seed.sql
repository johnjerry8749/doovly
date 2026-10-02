-- ============================================================
-- Doovly seed — matches src/data/* and the app flow
-- Local login (every seeded user): password  DoovlyDev123!
--
-- mock_id is the id the app uses today ("1", "u1", "b1", "c1").
-- UUID columns are the production keys. Swap the client to UUIDs
-- later without reshaping tables.
--
-- Professional accounts are NOT the booking customers.
--   pro 1 John Chukwuemeka     = u1
--   pro 2 Chioma Eze           = p2
--   pro 3 Ikechukwu Obi        = p3
--   pro 4 Blessing Joy         = p4
--   pro 5 Emeka Okoro          = p5
--   pro 6 Aisha Bello          = p6
--   u2 Ada Okafor, u3 Tunde, u4 Chioma Nwosu are customers only
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- Auth users (idempotent, works across recent GoTrue schemas)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._seed_auth_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  col_list TEXT := 'instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at';
  val_list TEXT := '$1, $2, ''authenticated'', ''authenticated'', $3, $4, now(), ''{"provider":"email","providers":["email"]}''::jsonb, $5, now(), now()';
  has_provider_id BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'confirmation_token'
  ) THEN
    col_list := col_list || ', confirmation_token, recovery_token, email_change_token_new, email_change';
    val_list := val_list || ', '''', '''', '''', ''''';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_token_current'
  ) THEN
    col_list := col_list || ', email_change_token_current';
    val_list := val_list || ', ''''';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user'
  ) THEN
    col_list := col_list || ', is_sso_user';
    val_list := val_list || ', false';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous'
  ) THEN
    col_list := col_list || ', is_anonymous';
    val_list := val_list || ', false';
  END IF;

  EXECUTE format(
    'INSERT INTO auth.users (%s) VALUES (%s)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       encrypted_password = EXCLUDED.encrypted_password,
       raw_user_meta_data = EXCLUDED.raw_user_meta_data,
       email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now())',
    col_list,
    val_list
  )
  USING
    '00000000-0000-0000-0000-000000000000'::UUID,
    p_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    jsonb_build_object('full_name', p_full_name);

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    UPDATE auth.users
    SET phone = p_phone,
        phone_confirmed_at = COALESCE(phone_confirmed_at, now())
    WHERE id = p_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
  ) INTO has_provider_id;

  IF has_provider_id THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    SELECT
      p_id,
      p_id,
      jsonb_build_object('sub', p_id::TEXT, 'email', p_email, 'email_verified', true),
      'email',
      p_id::TEXT,
      now(), now(), now()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = p_id AND provider = 'email'
    );
  ELSE
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    SELECT
      p_id,
      p_id,
      jsonb_build_object('sub', p_id::TEXT, 'email', p_email),
      'email',
      now(), now(), now()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = p_id AND provider = 'email'
    );
  END IF;
END;
$$;

SELECT public._seed_auth_user('11111111-1111-1111-1111-111111111111', 'john.chukwuemeka@email.com', 'DoovlyDev123!', 'John Chukwuemeka', '+2348031112201');
SELECT public._seed_auth_user('b2222222-2222-2222-2222-222222222222', 'chioma.eze@email.com', 'DoovlyDev123!', 'Chioma Eze', '+2348022223302');
SELECT public._seed_auth_user('b3333333-3333-3333-3333-333333333333', 'ikechukwu.obi@email.com', 'DoovlyDev123!', 'Ikechukwu Obi', '+2348053334403');
SELECT public._seed_auth_user('b4444444-4444-4444-4444-444444444444', 'blessing.joy@email.com', 'DoovlyDev123!', 'Blessing Joy', '+2348064445504');
SELECT public._seed_auth_user('b5555555-5555-5555-5555-555555555555', 'emeka.okoro@email.com', 'DoovlyDev123!', 'Emeka Okoro', '+2348075556605');
SELECT public._seed_auth_user('b6666666-6666-6666-6666-666666666666', 'aisha.bello@email.com', 'DoovlyDev123!', 'Aisha Bello', '+2348096667706');
SELECT public._seed_auth_user('22222222-2222-2222-2222-222222222222', 'ada.okafor@email.com', 'DoovlyDev123!', 'Ada Okafor', '+2348010000002');
SELECT public._seed_auth_user('33333333-3333-3333-3333-333333333333', 'tunde.adebayo@email.com', 'DoovlyDev123!', 'Tunde Adebayo', '+2348010000003');
SELECT public._seed_auth_user('44444444-4444-4444-4444-444444444444', 'chioma.nwosu@email.com', 'DoovlyDev123!', 'Chioma Nwosu', '+2348010000004');
SELECT public._seed_auth_user('55555555-5555-5555-5555-555555555555', 'blessing.k@email.com', 'DoovlyDev123!', 'Blessing K.', '+2348010000005');
SELECT public._seed_auth_user('66666666-6666-6666-6666-666666666666', 'amaka.r@email.com', 'DoovlyDev123!', 'Amaka R.', '+2348010000006');
SELECT public._seed_auth_user('77777777-7777-7777-7777-777777777777', 'emeka.p@email.com', 'DoovlyDev123!', 'Emeka P.', '+2348010000007');
SELECT public._seed_auth_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'blessing.poster@email.com', 'DoovlyDev123!', 'Blessing Joy', '+2348010000011');

-- ------------------------------------------------------------
-- Profiles (trigger may already have inserted stubs)
-- ------------------------------------------------------------
INSERT INTO public.profiles (
  id, mock_id, full_name, phone, email, avatar_url, role, city,
  is_suspended, is_online, last_active_at, last_active_label, member_since
) VALUES
  ('11111111-1111-1111-1111-111111111111', 'u1', 'John Chukwuemeka', '+234 803 111 2201', 'john.chukwuemeka@email.com', NULL, 'admin', 'Lagos', false, true,  TIMESTAMPTZ '2026-10-02 10:00:00+01' - INTERVAL '2 hours', '2 hours ago', '2025-01-12'),
  ('b2222222-2222-2222-2222-222222222222', 'p2', 'Chioma Eze', '+234 802 222 3302', 'chioma.eze@email.com', NULL, 'user', 'Lagos', false, true,  TIMESTAMPTZ '2026-10-02 10:00:00+01' - INTERVAL '5 hours', '5 hours ago', '2025-02-03'),
  ('b3333333-3333-3333-3333-333333333333', 'p3', 'Ikechukwu Obi', '+234 805 333 4403', 'ikechukwu.obi@email.com', NULL, 'user', 'Abuja', false, true,  TIMESTAMPTZ '2026-10-02 10:00:00+01' - INTERVAL '1 day', '1 day ago', '2025-03-18'),
  ('b4444444-4444-4444-4444-444444444444', 'p4', 'Blessing Joy', '+234 806 444 5504', 'blessing.joy@email.com', NULL, 'user', 'Lagos', false, false, TIMESTAMPTZ '2026-10-02 10:00:00+01' - INTERVAL '3 days', '3 days ago', '2025-04-05'),
  ('b5555555-5555-5555-5555-555555555555', 'p5', 'Emeka Okoro', '+234 807 555 6605', 'emeka.okoro@email.com', NULL, 'user', 'Port Harcourt', false, false, TIMESTAMPTZ '2026-10-02 10:00:00+01' - INTERVAL '7 days', '1 week ago', '2025-05-22'),
  ('b6666666-6666-6666-6666-666666666666', 'p6', 'Aisha Bello', '+234 809 666 7706', 'aisha.bello@email.com', NULL, 'user', 'Abuja', false, false, TIMESTAMPTZ '2026-10-02 10:00:00+01', 'Just now', '2025-06-10'),
  ('22222222-2222-2222-2222-222222222222', 'u2', 'Ada Okafor', '+234 801 000 0002', 'ada.okafor@email.com', NULL, 'user', 'Lagos', false, false, NULL, NULL, NULL),
  ('33333333-3333-3333-3333-333333333333', 'u3', 'Tunde Adebayo', '+234 801 000 0003', 'tunde.adebayo@email.com', NULL, 'user', 'Lagos', false, false, NULL, NULL, NULL),
  ('44444444-4444-4444-4444-444444444444', 'u4', 'Chioma Nwosu', '+234 801 000 0004', 'chioma.nwosu@email.com', NULL, 'user', 'Lagos', false, false, NULL, NULL, NULL),
  ('55555555-5555-5555-5555-555555555555', 'u5', 'Blessing K.', '+234 801 000 0005', 'blessing.k@email.com', NULL, 'user', 'Lagos', false, false, NULL, NULL, NULL),
  ('66666666-6666-6666-6666-666666666666', 'u6', 'Amaka R.', '+234 801 000 0006', 'amaka.r@email.com', NULL, 'user', 'Lagos', false, false, NULL, NULL, NULL),
  ('77777777-7777-7777-7777-777777777777', 'u7', 'Emeka P.', '+234 801 000 0007', 'emeka.p@email.com', NULL, 'user', 'Abuja', false, false, NULL, NULL, NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'u11', 'Blessing Joy', '+234 801 000 0011', 'blessing.poster@email.com', NULL, 'user', 'Lagos', false, false, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  mock_id = EXCLUDED.mock_id,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  city = EXCLUDED.city,
  is_suspended = EXCLUDED.is_suspended,
  is_online = EXCLUDED.is_online,
  last_active_at = EXCLUDED.last_active_at,
  last_active_label = EXCLUDED.last_active_label,
  member_since = EXCLUDED.member_since;

-- Clean previous demo rows so re-seed does not duplicate children
DELETE FROM public.service_requests
WHERE mock_id IN ('1','2','3','4','5','6','7','11')
   OR title IN (
     'Leaking pipe in bathroom',
     'Need electrician to fix power',
     'Car needs urgent repair',
     'Haircut and beard trim',
     'Gel nails and manicure',
     'House wiring check',
     'Blocked kitchen sink',
     'Home Cleaning Needed'
   );

DELETE FROM public.bookings
WHERE mock_id IN ('b1','b2','b3','r1','r2','r3')
   OR professional_id IN (
     'a1000000-0000-0000-0000-000000000001',
     'a1000000-0000-0000-0000-000000000002',
     'a1000000-0000-0000-0000-000000000003',
     'a1000000-0000-0000-0000-000000000004',
     'a1000000-0000-0000-0000-000000000005',
     'a1000000-0000-0000-0000-000000000006'
   );

DELETE FROM public.notifications
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

DELETE FROM public.conversations
WHERE mock_id IN ('c1','c2','c3','c4');

DELETE FROM public.admin_notifications
WHERE mock_id IN ('an1','an2','an3','an4','an5','an6');

-- ------------------------------------------------------------
-- Professionals (src/data/professionals.ts)
-- rating = floor(review_count / 10), same rule as starsFromReviewCount
-- ------------------------------------------------------------
INSERT INTO public.professionals (
  id, mock_id, user_id, profession, bio, city, price_from, price_from_value,
  is_verified, is_available, subscribed, latitude, longitude,
  rating, review_count, avatar_url, avatar_key
) VALUES
  ('a1000000-0000-0000-0000-000000000001', '1', '11111111-1111-1111-1111-111111111111', 'Plumber',
    'Experienced plumber with 8+ years fixing residential and commercial systems across Lagos.',
    'Lagos', '₦8,000', 8000, true, true, false, 6.5244, 3.3792, 0, 3, NULL, 'profile_1'),
  ('a1000000-0000-0000-0000-000000000002', '2', 'b2222222-2222-2222-2222-222222222222', 'Nail Tech',
    'Creative nail tech specializing in gel extensions and bridal nail art.',
    'Lagos', '₦6,000', 6000, true, true, true, 6.6018, 3.3515, 0, 2, NULL, 'profile_2'),
  ('a1000000-0000-0000-0000-000000000003', '3', 'b3333333-3333-3333-3333-333333333333', 'Mechanic',
    'Mobile mechanic for engine diagnostics, brakes, and same-day repairs.',
    'Abuja', '₦10,000', 10000, false, true, true, 9.0765, 7.3986, 0, 2, NULL, 'profile_3'),
  ('a1000000-0000-0000-0000-000000000004', '4', 'b4444444-4444-4444-4444-444444444444', 'Massage Therapist',
    'Certified massage therapist focused on deep tissue and full-body relaxation.',
    'Lagos', '₦18,000', 18000, true, true, true, 6.4281, 3.4219, 0, 2, NULL, 'profile_4'),
  ('a1000000-0000-0000-0000-000000000005', '5', 'b5555555-5555-5555-5555-555555555555', 'Electrician',
    'Licensed electrician for home wiring, fault finding, and lighting installs.',
    'Port Harcourt', '₦7,500', 7500, false, true, true, 4.8156, 7.0498, 0, 2, NULL, 'profile_1'),
  ('a1000000-0000-0000-0000-000000000006', '6', 'b6666666-6666-6666-6666-666666666666', 'Barber',
    'Sharp fades and beard trims with a clean, professional finish every time.',
    'Abuja', '₦4,000', 4000, true, true, true, 9.0579, 7.4951, 0, 2, NULL, 'profile_2')
ON CONFLICT (id) DO UPDATE SET
  mock_id = EXCLUDED.mock_id,
  user_id = EXCLUDED.user_id,
  profession = EXCLUDED.profession,
  bio = EXCLUDED.bio,
  city = EXCLUDED.city,
  price_from = EXCLUDED.price_from,
  price_from_value = EXCLUDED.price_from_value,
  is_verified = EXCLUDED.is_verified,
  is_available = EXCLUDED.is_available,
  subscribed = EXCLUDED.subscribed,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  avatar_key = EXCLUDED.avatar_key;

DELETE FROM public.services WHERE professional_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006'
);
DELETE FROM public.reviews WHERE professional_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006'
);
DELETE FROM public.portfolio_items WHERE professional_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006'
);

INSERT INTO public.services (id, professional_id, mock_id, name, description, price, price_value, icon) VALUES
  ('c1000000-0000-0000-0001-000000000001', 'a1000000-0000-0000-0000-000000000001', 's1', 'Plumbing Installation', 'Professional installation of pipes, taps, fixtures and fittings.', '₦8,000', 8000, 'pipe'),
  ('c1000000-0000-0000-0001-000000000002', 'a1000000-0000-0000-0000-000000000001', 's2', 'Drain Cleaning', 'Professional drain cleaning and blockage removal.', '₦10,000', 10000, 'pipe-leak'),
  ('c1000000-0000-0000-0001-000000000003', 'a1000000-0000-0000-0000-000000000001', 's3', 'Water Heater Repair', 'Repair and maintenance of electric and gas water heaters.', '₦12,000', 12000, 'water-boiler'),
  ('c1000000-0000-0000-0002-000000000001', 'a1000000-0000-0000-0000-000000000002', 's1', 'Nail Extension', 'Acrylic and gel nail extensions with custom designs.', '₦6,000', 6000, 'nail'),
  ('c1000000-0000-0000-0002-000000000002', 'a1000000-0000-0000-0000-000000000002', 's2', 'Manicure & Pedicure', 'Complete manicure and pedicure treatment.', '₦8,000', 8000, 'hand-okay'),
  ('c1000000-0000-0000-0002-000000000003', 'a1000000-0000-0000-0000-000000000002', 's3', 'Nail Art', 'Creative nail art and detailed custom designs.', '₦4,000', 4000, 'brush'),
  ('c1000000-0000-0000-0003-000000000001', 'a1000000-0000-0000-0000-000000000003', 's1', 'Engine Diagnostics', 'Complete engine inspection and fault diagnosis.', '₦10,000', 10000, 'car-wrench'),
  ('c1000000-0000-0000-0003-000000000002', 'a1000000-0000-0000-0000-000000000003', 's2', 'Oil Change', 'Engine oil and filter replacement service.', '₦15,000', 15000, 'oil'),
  ('c1000000-0000-0000-0003-000000000003', 'a1000000-0000-0000-0000-000000000003', 's3', 'Brake Repair', 'Brake inspection, repair and replacement.', '₦12,000', 12000, 'car-brake-alert'),
  ('c1000000-0000-0000-0004-000000000001', 'a1000000-0000-0000-0000-000000000004', 's1', 'Full Body Massage', 'Relaxing full body massage session lasting 60–90 minutes.', '₦18,000', 18000, 'spa'),
  ('c1000000-0000-0000-0004-000000000002', 'a1000000-0000-0000-0000-000000000004', 's2', 'Deep Tissue Massage', 'Focused massage designed for muscle tension and relaxation.', '₦22,000', 22000, 'hand-back-right'),
  ('c1000000-0000-0000-0005-000000000001', 'a1000000-0000-0000-0000-000000000005', 's1', 'Wiring & Installation', 'Home and office electrical wiring and installations.', '₦7,500', 7500, 'flash'),
  ('c1000000-0000-0000-0005-000000000002', 'a1000000-0000-0000-0000-000000000005', 's2', 'Fault Finding', 'Diagnose and repair electrical faults safely.', '₦9,000', 9000, 'lightning-bolt'),
  ('c1000000-0000-0000-0005-000000000003', 'a1000000-0000-0000-0000-000000000005', 's3', 'Lighting Installation', 'Indoor and outdoor lighting installation.', '₦6,000', 6000, 'lightbulb'),
  ('c1000000-0000-0000-0006-000000000001', 'a1000000-0000-0000-0000-000000000006', 's1', 'Haircut', 'Classic and modern haircuts for men.', '₦4,000', 4000, 'content-cut'),
  ('c1000000-0000-0000-0006-000000000002', 'a1000000-0000-0000-0000-000000000006', 's2', 'Beard Trim', 'Professional beard shaping and trimming.', '₦2,500', 2500, 'mustache'),
  ('c1000000-0000-0000-0006-000000000003', 'a1000000-0000-0000-0000-000000000006', 's3', 'Haircut & Beard', 'Complete haircut and beard grooming package.', '₦6,000', 6000, 'face-man');

INSERT INTO public.portfolio_items (id, professional_id, mock_id, description, image_key, sort_order) VALUES
  ('e2000000-0000-0000-0001-000000000001', 'a1000000-0000-0000-0000-000000000001', 'p1', 'Installed new kitchen pipes, taps and drainage connections.', 'profile_1', 1),
  ('e2000000-0000-0000-0001-000000000002', 'a1000000-0000-0000-0000-000000000001', 'p2', 'Completed a full bathroom plumbing installation.', 'profile_3', 2),
  ('e2000000-0000-0000-0001-000000000003', 'a1000000-0000-0000-0000-000000000001', 'p3', 'Installed and tested a residential water heating system.', 'profile_4', 3),
  ('e2000000-0000-0000-0001-000000000004', 'a1000000-0000-0000-0000-000000000001', 'p4', 'Removed blockage and restored proper drainage flow.', 'profile_2', 4),
  ('e2000000-0000-0000-0002-000000000001', 'a1000000-0000-0000-0000-000000000002', 'p1', 'Elegant gel nails with a clean modern finish.', 'profile_2', 1),
  ('e2000000-0000-0000-0002-000000000002', 'a1000000-0000-0000-0000-000000000002', 'p2', 'Classic French tip design with a polished finish.', 'profile_4', 2),
  ('e2000000-0000-0000-0002-000000000003', 'a1000000-0000-0000-0000-000000000002', 'p3', 'Custom bridal nail design with detailed decoration.', 'profile_1', 3),
  ('e2000000-0000-0000-0002-000000000004', 'a1000000-0000-0000-0000-000000000002', 'p4', 'Premium nail art with custom patterns and finishing.', 'profile_3', 4),
  ('e2000000-0000-0000-0003-000000000001', 'a1000000-0000-0000-0000-000000000003', 'p1', 'Diagnosed and repaired a vehicle engine fault.', 'profile_3', 1),
  ('e2000000-0000-0000-0003-000000000002', 'a1000000-0000-0000-0000-000000000003', 'p2', 'Completed brake inspection and replacement.', 'profile_1', 2),
  ('e2000000-0000-0000-0003-000000000003', 'a1000000-0000-0000-0000-000000000003', 'p3', 'Performed full oil and filter replacement.', 'profile_4', 3),
  ('e2000000-0000-0000-0003-000000000004', 'a1000000-0000-0000-0000-000000000003', 'p4', 'Identified and resolved multiple dashboard fault codes.', 'profile_2', 4),
  ('e2000000-0000-0000-0004-000000000001', 'a1000000-0000-0000-0000-000000000004', 'p1', 'Completed a relaxing full body massage session.', 'profile_4', 1),
  ('e2000000-0000-0000-0004-000000000002', 'a1000000-0000-0000-0000-000000000004', 'p2', 'Provided targeted deep tissue massage treatment.', 'profile_2', 2),
  ('e2000000-0000-0000-0004-000000000003', 'a1000000-0000-0000-0000-000000000004', 'p3', 'Created a calming wellness session for a returning client.', 'profile_1', 3),
  ('e2000000-0000-0000-0004-000000000004', 'a1000000-0000-0000-0000-000000000004', 'p4', 'Delivered a personalized relaxation and wellness treatment.', 'profile_3', 4),
  ('e2000000-0000-0000-0005-000000000001', 'a1000000-0000-0000-0000-000000000005', 'p1', 'Completed electrical wiring for a residential property.', 'profile_1', 1),
  ('e2000000-0000-0000-0005-000000000002', 'a1000000-0000-0000-0000-000000000005', 'p2', 'Installed modern lighting throughout a home.', 'profile_3', 2),
  ('e2000000-0000-0000-0005-000000000003', 'a1000000-0000-0000-0000-000000000005', 'p3', 'Diagnosed and repaired multiple electrical faults.', 'profile_2', 3),
  ('e2000000-0000-0000-0005-000000000004', 'a1000000-0000-0000-0000-000000000005', 'p4', 'Completed electrical installation for a small office.', 'profile_4', 4),
  ('e2000000-0000-0000-0006-000000000001', 'a1000000-0000-0000-0000-000000000006', 'p1', 'Clean classic fade with a sharp professional finish.', 'profile_2', 1),
  ('e2000000-0000-0000-0006-000000000002', 'a1000000-0000-0000-0000-000000000006', 'p2', 'Detailed beard shaping and grooming service.', 'profile_4', 2),
  ('e2000000-0000-0000-0006-000000000003', 'a1000000-0000-0000-0000-000000000006', 'p3', 'Modern low fade with a clean line-up.', 'profile_1', 3),
  ('e2000000-0000-0000-0006-000000000004', 'a1000000-0000-0000-0000-000000000006', 'p4', 'Complete haircut, beard trim and styling.', 'profile_3', 4);

INSERT INTO public.reviews (id, professional_id, user_id, mock_id, user_name, comment, created_at) VALUES
  ('d2000000-0000-0000-0001-000000000001', 'a1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'r1', 'Ada O.', 'Very professional and on time. Fixed my kitchen sink perfectly.', '2025-05-10'),
  ('d2000000-0000-0000-0001-000000000002', 'a1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'r2', 'Tunde A.', 'Honest pricing and clean work. Highly recommended.', '2025-04-28'),
  ('d2000000-0000-0000-0001-000000000003', 'a1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'r3', 'Chioma N.', 'Good job overall. The quality of the work was excellent.', '2025-04-12'),
  ('d2000000-0000-0000-0002-000000000001', 'a1000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'r1', 'Blessing K.', 'Beautiful nails and very careful. Will book again.', '2025-05-05'),
  ('d2000000-0000-0000-0002-000000000002', 'a1000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', 'r2', 'Amaka R.', 'Very neat work and friendly service.', '2025-04-21'),
  ('d2000000-0000-0000-0003-000000000001', 'a1000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', 'r1', 'Emeka P.', 'Fixed my car the same day. Fair price.', '2025-05-01'),
  ('d2000000-0000-0000-0003-000000000002', 'a1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'r2', 'David O.', 'Explained the problem clearly and completed the repair.', '2025-04-18'),
  ('d2000000-0000-0000-0004-000000000001', 'a1000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'r1', 'Ngozi M.', 'Very relaxing. Professional and respectful.', '2025-04-20'),
  ('d2000000-0000-0000-0004-000000000002', 'a1000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'r2', 'Sarah A.', 'Great experience and very comfortable environment.', '2025-04-10'),
  ('d2000000-0000-0000-0005-000000000001', 'a1000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'r1', 'Ifeanyi D.', 'Quick and safe. Explained everything clearly.', '2025-05-08'),
  ('d2000000-0000-0000-0005-000000000002', 'a1000000-0000-0000-0000-000000000005', '66666666-6666-6666-6666-666666666666', 'r2', 'Chinedu K.', 'Very neat electrical work and fair pricing.', '2025-04-25'),
  ('d2000000-0000-0000-0006-000000000001', 'a1000000-0000-0000-0000-000000000006', '77777777-7777-7777-7777-777777777777', 'r1', 'Yusuf H.', 'Clean cut every time. Very professional.', '2025-05-03'),
  ('d2000000-0000-0000-0006-000000000002', 'a1000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'r2', 'Ibrahim S.', 'Great attention to detail and excellent service.', '2025-04-16');

-- Saved hearts from savedProviders.ts (current user saved "1" and "2")
INSERT INTO public.saved_providers (user_id, professional_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Bookings (src/data/booking.ts)
-- Booked = u1 hired someone else. Received = customers hired pro 1.
-- rating / reviews_count are the card snapshot, not the review table.
-- ------------------------------------------------------------
INSERT INTO public.bookings (
  id, mock_id, customer_id, professional_id, title, service_name, status,
  amount, location, scheduled_at, rating, reviews_count
) VALUES
  ('f3000000-0000-0000-0000-000000000001', 'b1', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000002', 'Nail Extension', 'Nail Extension', 'pending', 15400, 'Lagos', '2025-05-25 10:00:00+01', 4.9, 89),
  ('f3000000-0000-0000-0000-000000000002', 'b2', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000004', 'Full Body Massage', 'Full Body Massage', 'accepted', 18000, 'Lagos', '2025-05-22 14:30:00+01', 4.9, 32),
  ('f3000000-0000-0000-0000-000000000003', 'b3', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000003', 'Car Repair', 'Car Repair', 'declined', 28000, 'Abuja', '2025-05-18 11:00:00+01', 4.7, 64),
  ('f3000000-0000-0000-0000-000000000011', 'r1', '22222222-2222-2222-2222-222222222222', 'a1000000-0000-0000-0000-000000000001', 'House Cleaning', 'House Cleaning', 'pending', 15400, 'Lagos', '2025-05-28 09:00:00+01', 5.0, 12),
  ('f3000000-0000-0000-0000-000000000012', 'r2', '33333333-3333-3333-3333-333333333333', 'a1000000-0000-0000-0000-000000000001', 'AC Repair', 'AC Repair', 'accepted', 22000, 'Lagos', '2025-05-27 14:30:00+01', 4.8, 20),
  ('f3000000-0000-0000-0000-000000000013', 'r3', '44444444-4444-4444-4444-444444444444', 'a1000000-0000-0000-0000-000000000001', 'Furniture Assembly', 'Furniture Assembly', 'declined', 12000, 'Abuja', '2025-05-24 11:00:00+01', 4.9, 8);

-- ------------------------------------------------------------
-- Service requests + comments + the one existing offer
-- images / avatars are asset keys (profile_1 … profile_4) until CDN URLs exist
-- ------------------------------------------------------------
INSERT INTO public.service_requests (
  id, mock_id, title, category, profession, location, city, description,
  icon, icon_background, images, is_new, created_by, poster_name,
  poster_avatar_url, poster_verified, likes_count, max_offers, offers_count,
  offered_by, latitude, longitude, created_at
) VALUES
  ('a4000000-0000-0000-0000-000000000001', '1', 'Leaking pipe in bathroom', 'Plumbing', 'Plumber', 'Victoria Island', 'Lagos',
    'Bathroom pipe is leaking under the sink. Need someone experienced who can fix it today if possible.',
    'water-pump', '#FFF1D5', ARRAY['profile_1','profile_3','profile_2','profile_4'], true,
    '22222222-2222-2222-2222-222222222222', 'Amaka O.', 'profile_2', true, 14, 3, 1,
    ARRAY['11111111-1111-1111-1111-111111111111']::UUID[], 6.4281, 3.4219, NOW() - INTERVAL '2 minutes'),
  ('a4000000-0000-0000-0000-000000000002', '2', 'Need electrician to fix power', 'Electrical', 'Electrician', 'Lekki Phase 1', 'Lagos',
    'Power keeps tripping in the living room. Looking for a licensed electrician to diagnose and fix.',
    'flash', '#DDF2FF', ARRAY['profile_3','profile_1','profile_4'], true,
    '33333333-3333-3333-3333-333333333333', 'Emeka Okoro', 'profile_1', false, 9, 5, 0,
    '{}'::uuid[], 6.4474, 3.4722, NOW() - INTERVAL '5 minutes'),
  ('a4000000-0000-0000-0000-000000000003', '3', 'Car needs urgent repair', 'Mechanic', 'Mechanic', 'Ikoyi', 'Lagos',
    'Engine warning light is on and the car is making a strange noise. Need a reliable mechanic ASAP.',
    'car-wrench', '#E9E1FF', ARRAY['profile_3','profile_4'], true,
    '44444444-4444-4444-4444-444444444444', 'Ikechukwu Obi', 'profile_3', false, 31, 5, 0,
    '{}'::uuid[], 6.4541, 3.4316, NOW() - INTERVAL '8 minutes'),
  ('a4000000-0000-0000-0000-000000000004', '4', 'Haircut and beard trim', 'Barber', 'Barber', 'Garki', 'Abuja',
    'Looking for a clean haircut and beard trim. Prefer someone who can come to my location.',
    'content-cut', '#E8F5E9', ARRAY['profile_2'], false,
    '55555555-5555-5555-5555-555555555555', 'Aisha Bello', 'profile_2', true, 6, 5, 0,
    '{}'::uuid[], 9.0579, 7.4951, NOW() - INTERVAL '12 minutes'),
  ('a4000000-0000-0000-0000-000000000005', '5', 'Gel nails and manicure', 'Nail Tech', 'Nail Tech', 'Surulere', 'Lagos',
    'Need gel nails and a full manicure. Looking for a neat and experienced nail tech.',
    'nail', '#FCE4EC', ARRAY['profile_2','profile_4','profile_1'], false,
    '66666666-6666-6666-6666-666666666666', 'Chioma Eze', 'profile_2', true, 18, 5, 0,
    '{}'::uuid[], 6.4969, 3.3481, NOW() - INTERVAL '20 minutes'),
  ('a4000000-0000-0000-0000-000000000006', '6', 'House wiring check', 'Electrical', 'Electrician', 'GRA', 'Port Harcourt',
    'Need a full house wiring safety check. Some outlets are warm and lights flicker.',
    'flash', '#DDF2FF', ARRAY['profile_1','profile_3'], false,
    '77777777-7777-7777-7777-777777777777', 'Emeka Okoro', 'profile_1', false, 4, 5, 0,
    '{}'::uuid[], 4.8156, 7.0498, NOW() - INTERVAL '25 minutes'),
  ('a4000000-0000-0000-0000-000000000007', '7', 'Blocked kitchen sink', 'Plumbing', 'Plumber', 'Wuse 2', 'Abuja',
    'Kitchen sink is fully blocked. Need a plumber who can clear it and check the pipes.',
    'water-pump', '#FFF1D5', ARRAY['profile_1','profile_3','profile_4','profile_2'], true,
    '11111111-1111-1111-1111-111111111111', 'John Chukwuemeka', 'profile_1', false, 11, 5, 0,
    '{}'::uuid[], 9.0765, 7.3986, NOW() - INTERVAL '30 minutes'),
  ('a4000000-0000-0000-0000-000000000011', '11', 'Home Cleaning Needed', 'Cleaning', 'Cleaner', 'Lekki Phase 1', 'Lagos',
    'Looking for a reliable cleaner to deep clean my 2 bedroom apartment. Must bring own equipment.',
    'broom', '#D1FAE5', ARRAY['profile_4','profile_2','profile_1'], true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Blessing Joy', 'profile_4', true, 22, 5, 0,
    '{}'::uuid[], 6.4474, 3.4722, NOW() - INTERVAL '2 hours');

INSERT INTO public.service_request_comments (
  id, mock_id, request_id, user_id, user_name, user_avatar_url, text, created_at
) VALUES
  ('a5000000-0000-0000-0000-000000000001', 'c1', 'a4000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'John Chukwuemeka', 'profile_1', 'I can come today after 3pm. DM me.', NOW() - INTERVAL '1 minute'),
  ('a5000000-0000-0000-0000-000000000002', 'c2', 'a4000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'Emeka Okoro', 'profile_1', 'We can tow and diagnose same day.', NOW() - INTERVAL '3 minutes'),
  ('a5000000-0000-0000-0000-000000000003', 'c3', 'a4000000-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', 'Blessing Joy', 'profile_4', 'I have slots tomorrow afternoon!', NOW() - INTERVAL '10 minutes'),
  ('a5000000-0000-0000-0000-000000000004', 'c4', 'a4000000-0000-0000-0000-000000000011', '22222222-2222-2222-2222-222222222222', 'Chioma Eze', 'profile_2', 'I''m available for this. I have 4 years experience in home cleaning.', NOW() - INTERVAL '1 hour'),
  ('a5000000-0000-0000-0000-000000000005', 'c5', 'a4000000-0000-0000-0000-000000000011', '66666666-6666-6666-6666-666666666666', 'Aisha Bello', 'profile_2', 'Can do this weekend if still open.', NOW() - INTERVAL '45 minutes');

INSERT INTO public.service_request_offers (
  id, mock_id, request_id, user_id, professional_id, amount, message, status, created_at
) VALUES (
  'ab000000-0000-0000-0000-000000000001', 'o1',
  'a4000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'a1000000-0000-0000-0000-000000000001',
  8000,
  'I can come today after 3pm. DM me.',
  'pending',
  NOW() - INTERVAL '1 minute'
);

-- ------------------------------------------------------------
-- In-app notifications (src/data/notifications.ts)
-- ------------------------------------------------------------
INSERT INTO public.notifications (id, mock_id, user_id, type, title, body, unread, created_at) VALUES
  ('a6000000-0000-0000-0000-000000000001', 'n1', '11111111-1111-1111-1111-111111111111', 'booking', 'Booking Confirmed', 'Your booking with Tunde Electrician has been confirmed.', true, NOW() - INTERVAL '2 minutes'),
  ('a6000000-0000-0000-0000-000000000002', 'n2', '11111111-1111-1111-1111-111111111111', 'upcoming', 'Upcoming Booking', 'You have a booking with Bright Cleaning scheduled for tomorrow at 10:00 AM.', true, NOW() - INTERVAL '25 minutes'),
  ('a6000000-0000-0000-0000-000000000003', 'n3', '11111111-1111-1111-1111-111111111111', 'message', 'New Message', 'You have a new message from Sarah Makeover.', true, NOW() - INTERVAL '1 hour'),
  ('a6000000-0000-0000-0000-000000000004', 'n4', '11111111-1111-1111-1111-111111111111', 'payment', 'Payment Successful', 'Your payment of ₦15,000 was successful.', true, NOW() - INTERVAL '3 hours'),
  ('a6000000-0000-0000-0000-000000000005', 'n5', '11111111-1111-1111-1111-111111111111', 'verification', 'Verification Update', 'Your identity verification is under review.', true, NOW() - INTERVAL '1 day'),
  ('a6000000-0000-0000-0000-000000000006', 'n6', '11111111-1111-1111-1111-111111111111', 'review', 'Review Received', 'You received a 5-star review from John Doe.', true, NOW() - INTERVAL '2 days'),
  ('a6000000-0000-0000-0000-000000000007', 'n7', '11111111-1111-1111-1111-111111111111', 'general', 'Welcome to Doovly', 'Thanks for joining. Explore services near you.', false, NOW() - INTERVAL '3 days'),
  ('a6000000-0000-0000-0000-000000000008', 'n8', '22222222-2222-2222-2222-222222222222', 'booking', 'Booking Confirmed', 'Your booking with Chioma Plumber has been confirmed.', true, NOW() - INTERVAL '1 hour'),
  ('a6000000-0000-0000-0000-000000000009', 'n9', '22222222-2222-2222-2222-222222222222', 'general', 'Tip', 'Complete your profile to get more bookings.', true, NOW() - INTERVAL '2 days');

-- ------------------------------------------------------------
-- Chat (src/services/chat.ts) — participant is the professional's user
-- ------------------------------------------------------------
INSERT INTO public.conversations (id, mock_id, booking_id, last_message, last_message_at) VALUES
  ('ac000000-0000-0000-0000-000000000001', 'c1', 'f3000000-0000-0000-0000-000000000001', 'Hi! Is the dresser still available?', NOW() - INTERVAL '30 minutes'),
  ('ac000000-0000-0000-0000-000000000002', 'c2', 'f3000000-0000-0000-0000-000000000003', 'Thanks! Can we meet this weekend?', NOW() - INTERVAL '48 minutes'),
  ('ac000000-0000-0000-0000-000000000003', 'c3', 'f3000000-0000-0000-0000-000000000002', 'The plant pots are ready for pickup', NOW() - INTERVAL '1 day'),
  ('ac000000-0000-0000-0000-000000000004', 'c4', NULL, 'Sounds good! See you then.', NOW() - INTERVAL '1 day');

INSERT INTO public.conversation_members (conversation_id, user_id, unread_count) VALUES
  ('ac000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 2),
  ('ac000000-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222', 0),
  ('ac000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1),
  ('ac000000-0000-0000-0000-000000000002', 'b3333333-3333-3333-3333-333333333333', 0),
  ('ac000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 3),
  ('ac000000-0000-0000-0000-000000000003', 'b4444444-4444-4444-4444-444444444444', 0),
  ('ac000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 0),
  ('ac000000-0000-0000-0000-000000000004', 'b5555555-5555-5555-5555-555555555555', 0);

INSERT INTO public.messages (id, mock_id, conversation_id, sender_id, body, kind, created_at) VALUES
  ('ad000000-0000-0000-0000-000000000001', 'm1', 'ac000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Hi Chioma, thank you for connecting.', 'text', NOW() - INTERVAL '32 minutes'),
  ('ad000000-0000-0000-0000-000000000002', 'm2', 'ac000000-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222', 'Hi! Thanks for reaching out.', 'text', NOW() - INTERVAL '30 minutes'),
  ('ad000000-0000-0000-0000-000000000003', 'm1', 'ac000000-0000-0000-0000-000000000002', 'b3333333-3333-3333-3333-333333333333', 'Thanks! Can we meet this weekend?', 'text', NOW() - INTERVAL '48 minutes'),
  ('ad000000-0000-0000-0000-000000000004', 'm1', 'ac000000-0000-0000-0000-000000000003', 'b4444444-4444-4444-4444-444444444444', 'The plant pots are ready for pickup', 'text', NOW() - INTERVAL '1 day'),
  ('ad000000-0000-0000-0000-000000000005', 'm1', 'ac000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Sounds good! See you then.', 'text', NOW() - INTERVAL '1 day');

-- ------------------------------------------------------------
-- Plans, subscriptions, verification, admin broadcasts
-- ------------------------------------------------------------
INSERT INTO public.subscription_plans (id, name, tagline, monthly_price, yearly_price, popular, sort_order) VALUES
  ('basic', 'Basic', 'Get started for free', 0, 0, false, 1),
  ('pro', 'Pro', 'Unlock more opportunities', 2500, 25000, true, 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  popular = EXCLUDED.popular;

INSERT INTO public.subscription_plan_features (id, plan_id, label, sort_order) VALUES
  ('b1', 'basic', 'Basic profile', 1),
  ('b2', 'basic', 'Browse service requests', 2),
  ('b3', 'basic', 'Limited applications (5 per month)', 3),
  ('b4', 'basic', 'Basic job filters', 4),
  ('b5', 'basic', 'Community support', 5),
  ('p1', 'pro', 'Verified / featured profile', 1),
  ('p2', 'pro', 'Unlimited applications', 2),
  ('p3', 'pro', 'Advanced job filters', 3),
  ('p4', 'pro', 'Priority nearby job alerts', 4),
  ('p5', 'pro', 'Earnings & performance dashboard', 5),
  ('p6', 'pro', 'Portfolio boost', 6),
  ('p7', 'pro', 'Dedicated support', 7)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, plan_id = EXCLUDED.plan_id;

INSERT INTO public.app_settings (id, promo_title, promo_subtitle, yearly_save_percent) VALUES (
  'subscription',
  'Unlock more opportunities',
  'Upgrade to get advanced tools, more visibility and grow your business faster.',
  17
)
ON CONFLICT (id) DO UPDATE SET
  promo_title = EXCLUDED.promo_title,
  promo_subtitle = EXCLUDED.promo_subtitle,
  yearly_save_percent = EXCLUDED.yearly_save_percent;

DELETE FROM public.user_subscriptions WHERE mock_id IN ('sub-1','sub-2','sub-3','sub-4','sub-5','sub-6');
INSERT INTO public.user_subscriptions (
  id, mock_id, user_id, professional_id, plan, status, status_label, start_date, end_date
) VALUES
  ('a8000000-0000-0000-0000-000000000001', 'sub-1', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Free', 'Active', 'Joined Oct 15, 2025', '2025-10-15', NULL),
  ('a8000000-0000-0000-0000-000000000002', 'sub-2', 'b2222222-2222-2222-2222-222222222222', 'a1000000-0000-0000-0000-000000000002', 'Pro', 'Active', 'Renews Oct 10, 2026', '2025-10-10', '2026-10-10'),
  ('a8000000-0000-0000-0000-000000000003', 'sub-3', 'b3333333-3333-3333-3333-333333333333', 'a1000000-0000-0000-0000-000000000003', 'Pro', 'Active', 'Renews Oct 5, 2026', '2025-10-05', '2026-10-05'),
  ('a8000000-0000-0000-0000-000000000004', 'sub-4', 'b4444444-4444-4444-4444-444444444444', 'a1000000-0000-0000-0000-000000000004', 'Pro', 'Active', 'Renews Sep 30, 2026', '2025-09-30', '2026-09-30'),
  ('a8000000-0000-0000-0000-000000000005', 'sub-5', 'b5555555-5555-5555-5555-555555555555', 'a1000000-0000-0000-0000-000000000005', 'Pro', 'Expired', 'Expired Aug 12, 2026', '2025-09-25', '2026-08-12'),
  ('a8000000-0000-0000-0000-000000000006', 'sub-6', 'b6666666-6666-6666-6666-666666666666', 'a1000000-0000-0000-0000-000000000006', 'Pro', 'Active', 'Renews Sep 20, 2026', '2025-09-20', '2026-09-20');

DELETE FROM public.verification_applications WHERE mock_id IN ('va-1','va-2','va-3','va-4','va-5','va-6');
INSERT INTO public.verification_applications (
  id, mock_id, professional_id, user_id, status, submitted_on
) VALUES
  ('a9000000-0000-0000-0000-000000000001', 'va-1', 'a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Verified', '2025-01-12'),
  ('a9000000-0000-0000-0000-000000000002', 'va-2', 'a1000000-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', 'Verified', '2025-01-09'),
  ('a9000000-0000-0000-0000-000000000003', 'va-3', 'a1000000-0000-0000-0000-000000000003', 'b3333333-3333-3333-3333-333333333333', 'Pending', '2025-01-06'),
  ('a9000000-0000-0000-0000-000000000004', 'va-4', 'a1000000-0000-0000-0000-000000000004', 'b4444444-4444-4444-4444-444444444444', 'Verified', '2025-01-03'),
  ('a9000000-0000-0000-0000-000000000005', 'va-5', 'a1000000-0000-0000-0000-000000000005', 'b5555555-5555-5555-5555-555555555555', 'Pending', '2024-12-31'),
  ('a9000000-0000-0000-0000-000000000006', 'va-6', 'a1000000-0000-0000-0000-000000000006', 'b6666666-6666-6666-6666-666666666666', 'Verified', '2024-12-28');

INSERT INTO public.verification_documents (
  id, mock_id, application_id, title, file_name, doc_type, uploaded, preview_key
) VALUES
  ('aa000000-0000-0000-0001-000000000001', 'va-1-gov', 'a9000000-0000-0000-0000-000000000001', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_1'),
  ('aa000000-0000-0000-0001-000000000002', 'va-1-lic', 'a9000000-0000-0000-0000-000000000001', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_1'),
  ('aa000000-0000-0000-0001-000000000003', 'va-1-cert', 'a9000000-0000-0000-0000-000000000001', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_1'),
  ('aa000000-0000-0000-0001-000000000004', 'va-1-photo', 'a9000000-0000-0000-0000-000000000001', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_1'),
  ('aa000000-0000-0000-0002-000000000001', 'va-2-gov', 'a9000000-0000-0000-0000-000000000002', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_2'),
  ('aa000000-0000-0000-0002-000000000002', 'va-2-lic', 'a9000000-0000-0000-0000-000000000002', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_2'),
  ('aa000000-0000-0000-0002-000000000003', 'va-2-cert', 'a9000000-0000-0000-0000-000000000002', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_2'),
  ('aa000000-0000-0000-0002-000000000004', 'va-2-photo', 'a9000000-0000-0000-0000-000000000002', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_2'),
  ('aa000000-0000-0000-0003-000000000001', 'va-3-gov', 'a9000000-0000-0000-0000-000000000003', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_3'),
  ('aa000000-0000-0000-0003-000000000002', 'va-3-lic', 'a9000000-0000-0000-0000-000000000003', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_3'),
  ('aa000000-0000-0000-0003-000000000003', 'va-3-cert', 'a9000000-0000-0000-0000-000000000003', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_3'),
  ('aa000000-0000-0000-0003-000000000004', 'va-3-photo', 'a9000000-0000-0000-0000-000000000003', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_3'),
  ('aa000000-0000-0000-0004-000000000001', 'va-4-gov', 'a9000000-0000-0000-0000-000000000004', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_4'),
  ('aa000000-0000-0000-0004-000000000002', 'va-4-lic', 'a9000000-0000-0000-0000-000000000004', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_4'),
  ('aa000000-0000-0000-0004-000000000003', 'va-4-cert', 'a9000000-0000-0000-0000-000000000004', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_4'),
  ('aa000000-0000-0000-0004-000000000004', 'va-4-photo', 'a9000000-0000-0000-0000-000000000004', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_4'),
  ('aa000000-0000-0000-0005-000000000001', 'va-5-gov', 'a9000000-0000-0000-0000-000000000005', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_1'),
  ('aa000000-0000-0000-0005-000000000002', 'va-5-lic', 'a9000000-0000-0000-0000-000000000005', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_1'),
  ('aa000000-0000-0000-0005-000000000003', 'va-5-cert', 'a9000000-0000-0000-0000-000000000005', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_1'),
  ('aa000000-0000-0000-0005-000000000004', 'va-5-photo', 'a9000000-0000-0000-0000-000000000005', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_1'),
  ('aa000000-0000-0000-0006-000000000001', 'va-6-gov', 'a9000000-0000-0000-0000-000000000006', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_2'),
  ('aa000000-0000-0000-0006-000000000002', 'va-6-lic', 'a9000000-0000-0000-0000-000000000006', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_2'),
  ('aa000000-0000-0000-0006-000000000003', 'va-6-cert', 'a9000000-0000-0000-0000-000000000006', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_2'),
  ('aa000000-0000-0000-0006-000000000004', 'va-6-photo', 'a9000000-0000-0000-0000-000000000006', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_2');

INSERT INTO public.admin_notifications (
  id, mock_id, title, message, channels, sent_to, sent_to_label, status, sent_at, created_by
) VALUES
  ('a7000000-0000-0000-0000-000000000001', 'an1', 'New Feature Available', 'Check out our latest features and improvements on the platform.', ARRAY['in-app','email','sms'], 'all', 'All Users', 'Sent', '2026-09-30 10:45:00+01', '11111111-1111-1111-1111-111111111111'),
  ('a7000000-0000-0000-0000-000000000002', 'an2', 'Service Request Alert', 'There are new service requests waiting for professionals.', ARRAY['in-app'], 'verified', 'Verified Users', 'Sent', '2026-09-29 14:15:00+01', '11111111-1111-1111-1111-111111111111'),
  ('a7000000-0000-0000-0000-000000000003', 'an3', 'Subscription Offer', 'Upgrade to Pro and get exclusive benefits this month.', ARRAY['in-app','email','sms'], 'subscribed', 'Subscribed Users', 'Sent', '2026-09-28 09:30:00+01', '11111111-1111-1111-1111-111111111111'),
  ('a7000000-0000-0000-0000-000000000004', 'an4', 'Account Verification', 'Your verification documents have been received and are under review.', ARRAY['email','sms'], 'free', 'Free Users', 'Sent', '2026-09-27 16:10:00+01', '11111111-1111-1111-1111-111111111111'),
  ('a7000000-0000-0000-0000-000000000005', 'an5', 'Payment Confirmation', 'Your payment of ₦2,500 has been successfully processed.', ARRAY['in-app','email'], 'all', 'All Users', 'Sent', '2026-09-26 11:20:00+01', '11111111-1111-1111-1111-111111111111'),
  ('a7000000-0000-0000-0000-000000000006', 'an6', 'System Maintenance', 'Our platform will be down for scheduled maintenance on Oct 5.', ARRAY['in-app','email','sms'], 'all', 'All Users', 'Scheduled', '2026-09-24 08:00:00+01', '11111111-1111-1111-1111-111111111111');

-- ------------------------------------------------------------
-- Categories + cities (static pickers)
-- ------------------------------------------------------------
INSERT INTO public.service_categories (name, icon, sort_order) VALUES
  ('Plumber', 'water-pump', 1),
  ('Electrician', 'flash', 2),
  ('Barber', 'content-cut', 3),
  ('Nail Tech', 'hand-okay', 4),
  ('Mechanic', 'car-wrench', 5),
  ('Spa', 'spa', 6),
  ('Cleaning', 'broom', 7)
ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO public.cities (name, sort_order)
SELECT name, ord
FROM (
  SELECT DISTINCT ON (name) name, ord
  FROM (VALUES
    (1, 'Lagos'), (2, 'Abuja'), (3, 'Port Harcourt'), (4, 'Ibadan'), (5, 'Kano'),
    (6, 'Benin City'), (7, 'Enugu'), (8, 'Abeokuta'), (9, 'Onitsha'), (10, 'Warri'),
    (11, 'Calabar'), (12, 'Uyo'), (13, 'Ilorin'), (14, 'Jos'), (15, 'Kaduna'),
    (16, 'Maiduguri'), (17, 'Aba'), (18, 'Owerri'), (19, 'Akure'), (20, 'Osogbo'),
    (21, 'Asaba'), (22, 'Umuahia'), (23, 'Yenagoa'), (24, 'Makurdi'), (25, 'Minna'),
    (26, 'Sokoto'), (27, 'Katsina'), (28, 'Gombe'), (29, 'Bauchi'), (30, 'Lokoja'),
    (31, 'Abakaliki'), (32, 'Abaji'), (33, 'Ado-Ekiti'), (34, 'Afikpo'), (35, 'Agbor'),
    (36, 'Akwanga'), (37, 'Ahoada'), (38, 'Auchi'), (39, 'Awka'), (40, 'Azare'),
    (41, 'Badagry'), (42, 'Bali'), (43, 'Bama'), (44, 'Bida'), (45, 'Birnin Kebbi'),
    (46, 'Birnin Kudu'), (47, 'Biu'), (48, 'Bonny'), (49, 'Bori'), (50, 'Brass'),
    (51, 'Bukuru'), (52, 'Damaturu'), (53, 'Daura'), (54, 'Degema'), (55, 'Dutse'),
    (56, 'Ede'), (57, 'Eket'), (58, 'Ekpoma'), (59, 'Epe'), (60, 'Eruwa'),
    (61, 'Funtua'), (62, 'Gashua'), (63, 'Gaya'), (64, 'Geidam'), (65, 'Gusau'),
    (66, 'Gwagwalada'), (67, 'Hadejia'), (68, 'Idah'), (69, 'Ijebu-Ode'), (70, 'Ijero'),
    (71, 'Ikare'), (72, 'Ikire'), (73, 'Ikole'), (74, 'Ikorodu'), (75, 'Ikot Ekpene'),
    (76, 'Ile-Ife'), (77, 'Ilesa'), (78, 'Ikom'), (79, 'Ilaro'), (80, 'Illela'),
    (81, 'Iseyin'), (82, 'Iwo'), (83, 'Jalingo'), (84, 'Jega'), (85, 'Kafanchan'),
    (86, 'Kafur Maradun'), (87, 'Kaura Namoda'), (88, 'Kazaure'), (89, 'Keffi'), (90, 'Kontagora'),
    (91, 'Kuje'), (92, 'Kwali'), (93, 'Lafia'), (94, 'Lafiagi'),
    (95, 'Malumfashi'), (96, 'Mubi'), (97, 'Nembe'), (98, 'New Bussa'), (99, 'Nnewi'),
    (100, 'Nsukka'), (101, 'Numan'), (102, 'Ogbomoso'), (103, 'Ogoja'), (104, 'Okene'),
    (105, 'Okigwe'), (106, 'Omu-Aran'), (107, 'Ondo'), (108, 'Orlu'), (109, 'Oron'),
    (110, 'Otukpo'), (111, 'Owo'), (112, 'Oyo'), (113, 'Pankshin'), (114, 'Potiskum'),
    (115, 'Sagamu'), (116, 'Sapele'), (117, 'Shendam'), (118, 'Suleja'), (119, 'Talata Mafara'),
    (120, 'Takum'), (121, 'Tambuwal'), (122, 'Udi'), (123, 'Ugep'), (124, 'Ughelli'),
    (125, 'Uromi'), (126, 'Wukari'), (127, 'Yauri'), (128, 'Yola'), (129, 'Zaria'),
    (130, 'Zuru')
  ) AS city(ord, name)
  ORDER BY name, ord
) deduped
ON CONFLICT (name) DO NOTHING;

DROP FUNCTION IF EXISTS public._seed_auth_user(UUID, TEXT, TEXT, TEXT, TEXT);

-- Local demo only. Do not reuse DoovlyDev123! on a hosted project.
-- Sign in as john.chukwuemeka@email.com (admin) or any other seeded email.
