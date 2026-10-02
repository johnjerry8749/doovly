-- ============================================================
-- Doovly – Seed data that 100% matches current mock
-- (src/data/professionals.ts, booking.ts, serviceRequests.ts,
--  notifications.ts)
--
-- IMPORTANT: These use fixed UUIDs so the seed is deterministic.
-- After running the migration + seed you can create matching
-- auth.users (or use the Supabase dashboard) with the same IDs
-- if you want full login. Until then the public tables work
-- for queries that do not require auth.uid().
-- ============================================================

-- Fixed UUIDs used throughout the seed
-- Profiles / users
-- u1  = current mock user (John Chukwuemeka / You)
-- u2  = Ada Okafor
-- u3  = Tunde Adebayo
-- u4  = Chioma Nwosu
-- u5  = Blessing K. / etc.
-- u6  = Amaka R.
-- u7  = Emeka P.

-- Professionals use their own UUIDs (pro-1 … pro-6)

-- ------------------------------------------------------------
-- 1. PROFILES
-- We insert with ON CONFLICT so re-running seed is safe.
-- Note: auth.users must exist for the FK. For local/dev you can
-- temporarily disable the FK or create dummy auth users first.
-- For pure public data testing the rest of the seed still works
-- after you create the profiles via the dashboard or a one-time
-- script. The UUIDs below are the contract.
-- ------------------------------------------------------------

-- Because profiles references auth.users, the cleanest local
-- approach is to create the auth users first (or use the
-- Supabase UI). The seed below assumes those UUIDs already exist
-- in auth.users. If you prefer a pure public seed without auth,
-- comment out the profiles insert and run only the tables that
-- do not require a live auth.user.

-- For convenience we use a DO block that skips missing auth users.

DO $$
DECLARE
  -- Profile UUIDs (must match auth.users if you want full auth)
  uid_u1  UUID := '11111111-1111-1111-1111-111111111111';
  uid_u2  UUID := '22222222-2222-2222-2222-222222222222';
  uid_u3  UUID := '33333333-3333-3333-3333-333333333333';
  uid_u4  UUID := '44444444-4444-4444-4444-444444444444';
  uid_u5  UUID := '55555555-5555-5555-5555-555555555555';
  uid_u6  UUID := '66666666-6666-6666-6666-666666666666';
  uid_u7  UUID := '77777777-7777-7777-7777-777777777777';
  uid_u11 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Professional UUIDs
  pro1 UUID := 'a1000000-0000-0000-0000-000000000001';
  pro2 UUID := 'a1000000-0000-0000-0000-000000000002';
  pro3 UUID := 'a1000000-0000-0000-0000-000000000003';
  pro4 UUID := 'a1000000-0000-0000-0000-000000000004';
  pro5 UUID := 'a1000000-0000-0000-0000-000000000005';
  pro6 UUID := 'a1000000-0000-0000-0000-000000000006';
BEGIN
  -- ----------------------------------------------------------
  -- PROFILES (only insert if the auth.user already exists)
  -- ----------------------------------------------------------
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u1, 'John Chukwuemeka', '+2348000000001', NULL, 'admin', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u1)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u2, 'Ada Okafor', '+2348000000002', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u2)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u3, 'Tunde Adebayo', '+2348000000003', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u3)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u4, 'Chioma Nwosu', '+2348000000004', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u4)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u5, 'Blessing K.', '+2348000000005', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u5)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u6, 'Amaka R.', '+2348000000006', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u6)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u7, 'Emeka P.', '+2348000000007', NULL, 'user', 'Abuja'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u7)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u11, 'Blessing Joy (poster)', '+2348000000011', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u11)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- ----------------------------------------------------------
  -- PROFESSIONALS (exactly the 6 from src/data/professionals.ts)
  -- We insert even if profile is missing by using a deferred
  -- approach: first create a temporary “system” profile if needed.
  -- For simplicity we require the profile rows above.
  -- ----------------------------------------------------------

  -- Pro 1 – John Chukwuemeka (Plumber, Lagos)  ← mock id "1"
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro1, uid_u1, 'Plumber',
    'Experienced plumber with 8+ years fixing residential and commercial systems across Lagos.',
    'Lagos', '₦8,000', 8000,
    true, true, false, 6.5244, 3.3792,
    0.3, 3, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1)
  ON CONFLICT (id) DO NOTHING;

  -- Pro 2 – Chioma Eze (Nail Tech)
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro2, uid_u2, 'Nail Tech',
    'Creative nail tech specializing in gel extensions and bridal nail art.',
    'Lagos', '₦6,000', 6000,
    true, true, true, 6.6018, 3.3515,
    0.2, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u2)
  ON CONFLICT (id) DO NOTHING;

  -- Pro 3 – Ikechukwu Obi (Mechanic, Abuja)
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro3, uid_u3, 'Mechanic',
    'Mobile mechanic for engine diagnostics, brakes, and same-day repairs.',
    'Abuja', '₦10,000', 10000,
    false, true, true, 9.0765, 7.3986,
    0.2, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u3)
  ON CONFLICT (id) DO NOTHING;

  -- Pro 4 – Blessing Joy (Massage Therapist)
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro4, uid_u4, 'Massage Therapist',
    'Certified massage therapist focused on deep tissue and full-body relaxation.',
    'Lagos', '₦18,000', 18000,
    true, true, true, 6.4281, 3.4219,
    0.2, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u4)
  ON CONFLICT (id) DO NOTHING;

  -- Pro 5 – Emeka Okoro (Electrician, Port Harcourt)
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro5, uid_u5, 'Electrician',
    'Licensed electrician for home wiring, fault finding, and lighting installs.',
    'Port Harcourt', '₦7,500', 7500,
    false, true, true, 4.8156, 7.0498,
    0.2, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u5)
  ON CONFLICT (id) DO NOTHING;

  -- Pro 6 – Aisha Bello (Barber, Abuja)
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro6, uid_u6, 'Barber',
    'Sharp fades and beard trims with a clean, professional finish every time.',
    'Abuja', '₦4,000', 4000,
    true, true, true, 9.0579, 7.4951,
    0.2, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u6)
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- SERVICES (exact names, prices, icons from mock)
  -- ----------------------------------------------------------

  -- Pro 1 services
  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro1, 'Plumbing Installation',
    'Professional installation of pipes, taps, fixtures and fittings.',
    '₦8,000', 8000, 'pipe'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro1, 'Drain Cleaning',
    'Professional drain cleaning and blockage removal.',
    '₦10,000', 10000, 'pipe-leak'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro1, 'Water Heater Repair',
    'Repair and maintenance of electric and gas water heaters.',
    '₦12,000', 12000, 'water-boiler'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  -- Pro 2 services
  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro2, 'Nail Extension',
    'Acrylic and gel nail extensions with custom designs.',
    '₦6,000', 6000, 'nail'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro2, 'Manicure & Pedicure',
    'Complete manicure and pedicure treatment.',
    '₦8,000', 8000, 'hand-okay'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro2, 'Nail Art',
    'Creative nail art and detailed custom designs.',
    '₦4,000', 4000, 'brush'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  -- Pro 3 services
  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro3, 'Engine Diagnostics',
    'Complete engine inspection and fault diagnosis.',
    '₦10,000', 10000, 'car-wrench'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro3, 'Oil Change',
    'Engine oil and filter replacement service.',
    '₦15,000', 15000, 'oil'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro3, 'Brake Repair',
    'Brake inspection, repair and replacement.',
    '₦12,000', 12000, 'car-brake-alert'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  -- Pro 4 services
  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro4, 'Full Body Massage',
    'Relaxing full body massage session lasting 60–90 minutes.',
    '₦18,000', 18000, 'spa'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro4, 'Deep Tissue Massage',
    'Focused massage designed for muscle tension and relaxation.',
    '₦22,000', 22000, 'hand-back-right'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  -- Pro 5 services
  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro5, 'Wiring & Installation',
    'Home and office electrical wiring and installations.',
    '₦7,500', 7500, 'flash'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro5, 'Fault Finding',
    'Diagnose and repair electrical faults safely.',
    '₦9,000', 9000, 'lightning-bolt'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro5, 'Lighting Installation',
    'Indoor and outdoor lighting installation.',
    '₦6,000', 6000, 'lightbulb'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  -- Pro 6 services
  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro6, 'Haircut',
    'Classic and modern haircuts for men.',
    '₦4,000', 4000, 'content-cut'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro6, 'Beard Trim',
    'Professional beard shaping and trimming.',
    '₦2,500', 2500, 'mustache'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  INSERT INTO public.services (professional_id, name, description, price, price_value, icon)
  SELECT pro6, 'Haircut & Beard',
    'Complete haircut and beard grooming package.',
    '₦6,000', 6000, 'face-man'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  -- ----------------------------------------------------------
  -- REVIEWS (exact comments + dates from mock)
  -- ----------------------------------------------------------
  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro1, uid_u2, 'Ada O.', 'Very professional and on time. Fixed my kitchen sink perfectly.', '2025-05-10'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro1, uid_u3, 'Tunde A.', 'Honest pricing and clean work. Highly recommended.', '2025-04-28'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro1, uid_u4, 'Chioma N.', 'Good job overall. The quality of the work was excellent.', '2025-04-12'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro2, uid_u5, 'Blessing K.', 'Beautiful nails and very careful. Will book again.', '2025-05-05'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro2, uid_u6, 'Amaka R.', 'Very neat work and friendly service.', '2025-04-21'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro3, uid_u7, 'Emeka P.', 'Fixed my car the same day. Fair price.', '2025-05-01'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro3, uid_u2, 'David O.', 'Explained the problem clearly and completed the repair.', '2025-04-18'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro4, uid_u3, 'Ngozi M.', 'Very relaxing. Professional and respectful.', '2025-04-20'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro4, uid_u4, 'Sarah A.', 'Great experience and very comfortable environment.', '2025-04-10'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro5, uid_u5, 'Ifeanyi D.', 'Quick and safe. Explained everything clearly.', '2025-05-08'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro5, uid_u6, 'Chinedu K.', 'Very neat electrical work and fair pricing.', '2025-04-25'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro6, uid_u7, 'Yusuf H.', 'Clean cut every time. Very professional.', '2025-05-03'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro6, uid_u2, 'Ibrahim S.', 'Great attention to detail and excellent service.', '2025-04-16'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  -- ----------------------------------------------------------
  -- BOOKINGS (exact from src/data/booking.ts)
  -- Booked by u1 + Received by pro1
  -- ----------------------------------------------------------

  -- Booked jobs (customer = u1)
  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u1, pro2, 'Nail Extension', 'Nail Extension', 'pending',
    15400, 'Lagos', '2025-05-25 10:00:00+01', 4.9, 89
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u1, pro4, 'Full Body Massage', 'Full Body Massage', 'accepted',
    18000, 'Lagos', '2025-05-22 14:30:00+01', 4.9, 32
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u1, pro3, 'Car Repair', 'Car Repair', 'declined',
    28000, 'Abuja', '2025-05-18 11:00:00+01', 4.7, 64
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  -- Received jobs (professional = pro1 / John)
  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u2, pro1, 'House Cleaning', 'House Cleaning', 'pending',
    15400, 'Lagos', '2025-05-28 09:00:00+01', 5.0, 12
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u3, pro1, 'AC Repair', 'AC Repair', 'accepted',
    22000, 'Lagos', '2025-05-27 14:30:00+01', 4.8, 20
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u4, pro1, 'Furniture Assembly', 'Furniture Assembly', 'declined',
    12000, 'Abuja', '2025-05-24 11:00:00+01', 4.9, 8
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1);

  -- ----------------------------------------------------------
  -- SERVICE REQUESTS (exact from src/data/serviceRequests.ts)
  -- ----------------------------------------------------------

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Leaking pipe in bathroom', 'Plumbing', 'Plumber',
    'Victoria Island', 'Lagos',
    'Bathroom pipe is leaking under the sink. Need someone experienced who can fix it today if possible.',
    'water-pump', '#FFF1D5', true, uid_u2, 'Amaka O.',
    true, 14, 3, 1, 6.4281, 3.4219, NOW() - INTERVAL '2 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u2);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Need electrician to fix power', 'Electrical', 'Electrician',
    'Lekki Phase 1', 'Lagos',
    'Power keeps tripping in the living room. Looking for a licensed electrician to diagnose and fix.',
    'flash', '#DDF2FF', true, uid_u3, 'Emeka Okoro',
    false, 9, 5, 0, 6.4474, 3.4722, NOW() - INTERVAL '5 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u3);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Car needs urgent repair', 'Mechanic', 'Mechanic',
    'Ikoyi', 'Lagos',
    'Engine warning light is on and the car is making a strange noise. Need a reliable mechanic ASAP.',
    'car-wrench', '#E9E1FF', true, uid_u4, 'Ikechukwu Obi',
    false, 31, 5, 0, 6.4541, 3.4316, NOW() - INTERVAL '8 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u4);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Haircut and beard trim', 'Barber', 'Barber',
    'Garki', 'Abuja',
    'Looking for a clean haircut and beard trim. Prefer someone who can come to my location.',
    'content-cut', '#E8F5E9', false, uid_u5, 'Aisha Bello',
    true, 6, 5, 0, 9.0579, 7.4951, NOW() - INTERVAL '12 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u5);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Gel nails and manicure', 'Nail Tech', 'Nail Tech',
    'Surulere', 'Lagos',
    'Need gel nails and a full manicure. Looking for a neat and experienced nail tech.',
    'nail', '#FCE4EC', false, uid_u6, 'Chioma Eze',
    true, 18, 5, 0, 6.4969, 3.3481, NOW() - INTERVAL '20 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u6);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'House wiring check', 'Electrical', 'Electrician',
    'GRA', 'Port Harcourt',
    'Need a full house wiring safety check. Some outlets are warm and lights flicker.',
    'flash', '#DDF2FF', false, uid_u7, 'Emeka Okoro',
    false, 4, 5, 0, 4.8156, 7.0498, NOW() - INTERVAL '25 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u7);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Blocked kitchen sink', 'Plumbing', 'Plumber',
    'Wuse 2', 'Abuja',
    'Kitchen sink is fully blocked. Need a plumber who can clear it and check the pipes.',
    'water-pump', '#FFF1D5', true, uid_u1, 'John Chukwuemeka',
    false, 11, 5, 0, 9.0765, 7.3986, NOW() - INTERVAL '30 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.service_requests (
    title, category, profession, location, city, description,
    icon, icon_background, is_new, created_by, poster_name,
    poster_verified, likes_count, max_offers, offers_count,
    latitude, longitude, created_at
  )
  SELECT
    'Home Cleaning Needed', 'Cleaning', 'Cleaner',
    'Lekki Phase 1', 'Lagos',
    'Looking for a reliable cleaner to deep clean my 2 bedroom apartment. Must bring own equipment.',
    'broom', '#D1FAE5', true, uid_u11, 'Blessing Joy',
    true, 22, 5, 0, 6.4474, 3.4722, NOW() - INTERVAL '2 hours'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u11);

  -- ----------------------------------------------------------
  -- SERVICE REQUEST COMMENTS (from mock)
  -- ----------------------------------------------------------
  INSERT INTO public.service_request_comments (request_id, user_id, user_name, text, created_at)
  SELECT sr.id, uid_u1, 'John Chukwuemeka', 'I can come today after 3pm. DM me.', NOW() - INTERVAL '1 minute'
  FROM public.service_requests sr
  WHERE sr.title = 'Leaking pipe in bathroom'
  LIMIT 1;

  INSERT INTO public.service_request_comments (request_id, user_id, user_name, text, created_at)
  SELECT sr.id, uid_u5, 'Emeka Okoro', 'We can tow and diagnose same day.', NOW() - INTERVAL '3 minutes'
  FROM public.service_requests sr
  WHERE sr.title = 'Car needs urgent repair'
  LIMIT 1;

  INSERT INTO public.service_request_comments (request_id, user_id, user_name, text, created_at)
  SELECT sr.id, uid_u4, 'Blessing Joy', 'I have slots tomorrow afternoon!', NOW() - INTERVAL '10 minutes'
  FROM public.service_requests sr
  WHERE sr.title = 'Gel nails and manicure'
  LIMIT 1;

  INSERT INTO public.service_request_comments (request_id, user_id, user_name, text, created_at)
  SELECT sr.id, uid_u2, 'Chioma Eze', 'I''m available for this. I have 4 years experience in home cleaning.', NOW() - INTERVAL '1 hour'
  FROM public.service_requests sr
  WHERE sr.title = 'Home Cleaning Needed'
  LIMIT 1;

  INSERT INTO public.service_request_comments (request_id, user_id, user_name, text, created_at)
  SELECT sr.id, uid_u6, 'Aisha Bello', 'Can do this weekend if still open.', NOW() - INTERVAL '45 minutes'
  FROM public.service_requests sr
  WHERE sr.title = 'Home Cleaning Needed'
  LIMIT 1;

  -- ----------------------------------------------------------
  -- NOTIFICATIONS (exact from src/data/notifications.ts for u1)
  -- ----------------------------------------------------------
  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'booking', 'Booking Confirmed',
    'Your booking with Tunde Electrician has been confirmed.', true, NOW() - INTERVAL '2 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'upcoming', 'Upcoming Booking',
    'You have a booking with Bright Cleaning scheduled for tomorrow at 10:00 AM.', true, NOW() - INTERVAL '25 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'message', 'New Message',
    'You have a new message from Sarah Makeover.', true, NOW() - INTERVAL '1 hour'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'payment', 'Payment Successful',
    'Your payment of ₦15,000 was successful.', true, NOW() - INTERVAL '3 hours'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'verification', 'Verification Update',
    'Your identity verification is under review.', true, NOW() - INTERVAL '1 day'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'review', 'Review Received',
    'You received a 5-star review from John Doe.', true, NOW() - INTERVAL '2 days'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'general', 'Welcome to Doovly',
    'Thanks for joining. Explore services near you.', false, NOW() - INTERVAL '3 days'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  -- Extra for u2 (as in mock)
  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u2, 'booking', 'Booking Confirmed',
    'Your booking with Chioma Plumber has been confirmed.', true, NOW() - INTERVAL '1 hour'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u2);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u2, 'general', 'Tip',
    'Complete your profile to get more bookings.', true, NOW() - INTERVAL '2 days'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u2);

END $$;

-- ============================================================
-- HOW TO USE THIS SEED
-- ============================================================
-- 1. Run the migration:  supabase db reset   (or push migration)
-- 2. Create matching auth users in Supabase Dashboard
--    (Authentication → Users) using the fixed UUIDs above,
--    OR use the SQL below after enabling the auth schema.
-- 3. Re-run seed if needed:  supabase db seed
--
-- Fixed UUIDs for quick reference:
--   u1  11111111-1111-1111-1111-111111111111  (John / current user)
--   u2  22222222-2222-2222-2222-222222222222
--   u3  33333333-3333-3333-3333-333333333333
--   u4  44444444-4444-4444-4444-444444444444
--   u5  55555555-5555-5555-5555-555555555555
--   u6  66666666-6666-6666-6666-666666666666
--   u7  77777777-7777-7777-7777-777777777777
--   pro1 a1000000-0000-0000-0000-000000000001  (John – Plumber)
--   pro2 a1000000-0000-0000-0000-000000000002  (Chioma – Nail Tech)
--   … etc.
-- ============================================================
