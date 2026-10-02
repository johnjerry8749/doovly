-- ============================================================
-- Doovly – Seed data aligned with current mock
-- Sources: src/data/professionals.ts, booking.ts, notifications.ts
--
-- ID map (mock → UUID):
--   MOCK_USER / customer "u1" / pro "1" (John)
--     → 11111111-1111-1111-1111-111111111111
--   customers "u2" Ada, "u3" Tunde, "u4" Chioma Nwosu
--     → 2222… / 3333… / 4444…
--   pro owners 2–6 (Chioma Eze, Ikechukwu, Blessing Joy, Emeka, Aisha)
--     → b2000000-…-0002 … b2000000-…-0006
--   professionals "1"–"6"
--     → a1000000-…-0001 … a1000000-…-0006
--
-- Auth: profile inserts only run if matching auth.users rows exist.
-- Create those users first (Dashboard or SQL), then run seed.
-- ============================================================

DO $$
DECLARE
  -- Logged-in mock user + John (pro 1 owner)
  uid_u1  UUID := '11111111-1111-1111-1111-111111111111';
  -- Booking customers (CUSTOMERS in booking.ts)
  uid_u2  UUID := '22222222-2222-2222-2222-222222222222'; -- Ada Okafor
  uid_u3  UUID := '33333333-3333-3333-3333-333333333333'; -- Tunde Adebayo
  uid_u4  UUID := '44444444-4444-4444-4444-444444444444'; -- Chioma Nwosu
  -- Professional account owners (match pro names, not customers)
  uid_p2  UUID := 'b2000000-0000-0000-0000-000000000002'; -- Chioma Eze
  uid_p3  UUID := 'b2000000-0000-0000-0000-000000000003'; -- Ikechukwu Obi
  uid_p4  UUID := 'b2000000-0000-0000-0000-000000000004'; -- Blessing Joy
  uid_p5  UUID := 'b2000000-0000-0000-0000-000000000005'; -- Emeka Okoro
  uid_p6  UUID := 'b2000000-0000-0000-0000-000000000006'; -- Aisha Bello
  -- Extra review / poster names (optional profiles)
  uid_r1  UUID := 'c3000000-0000-0000-0000-000000000001'; -- Blessing K.
  uid_r2  UUID := 'c3000000-0000-0000-0000-000000000002'; -- Amaka R.
  uid_r3  UUID := 'c3000000-0000-0000-0000-000000000003'; -- Emeka P.

  pro1 UUID := 'a1000000-0000-0000-0000-000000000001';
  pro2 UUID := 'a1000000-0000-0000-0000-000000000002';
  pro3 UUID := 'a1000000-0000-0000-0000-000000000003';
  pro4 UUID := 'a1000000-0000-0000-0000-000000000004';
  pro5 UUID := 'a1000000-0000-0000-0000-000000000005';
  pro6 UUID := 'a1000000-0000-0000-0000-000000000006';
BEGIN
  -- ----------------------------------------------------------
  -- PROFILES
  -- ----------------------------------------------------------
  -- John = mock u1 + pro "1" owner (role admin)
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_u1, 'John Chukwuemeka', '+234 803 111 2201', NULL, 'admin', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_u1)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    city = EXCLUDED.city;

  -- Booking customers only
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

  -- Pro owners 2–6 (names match professionals.ts)
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_p2, 'Chioma Eze', '+234 802 222 3302', NULL, 'professional', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_p2)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_p3, 'Ikechukwu Obi', '+234 805 333 4403', NULL, 'professional', 'Abuja'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_p3)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_p4, 'Blessing Joy', '+234 806 444 5504', NULL, 'professional', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_p4)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_p5, 'Emeka Okoro', '+234 807 555 6605', NULL, 'professional', 'Port Harcourt'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_p5)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_p6, 'Aisha Bello', '+234 809 666 7706', NULL, 'professional', 'Abuja'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_p6)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  -- Optional reviewer profiles (for FK on reviews when present)
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_r1, 'Blessing K.', '+2348000000005', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_r1)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_r2, 'Amaka R.', '+2348000000006', NULL, 'user', 'Lagos'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_r2)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role, city)
  SELECT uid_r3, 'Emeka P.', '+2348000000007', NULL, 'user', 'Abuja'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid_r3)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- ----------------------------------------------------------
  -- PROFESSIONALS (exact mock mapping)
  -- rating ≈ starsFromReviewCount: floor(count/10), max 5
  --   3 reviews → 0 stars stored as 0.0; UI may use separate scale
  -- We store review_count accurately; rating left as display hint.
  -- ----------------------------------------------------------
  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro1, uid_u1, 'Plumber',
    'Experienced plumber with 8+ years fixing residential and commercial systems across Lagos.',
    'Lagos', '₦8,000', 8000,
    true, true, false, 6.5244, 3.3792,
    0, 3, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    profession = EXCLUDED.profession,
    bio = EXCLUDED.bio,
    is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed,
    review_count = EXCLUDED.review_count;

  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro2, uid_p2, 'Nail Tech',
    'Creative nail tech specializing in gel extensions and bridal nail art.',
    'Lagos', '₦6,000', 6000,
    true, true, true, 6.6018, 3.3515,
    0, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_p2)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    profession = EXCLUDED.profession,
    bio = EXCLUDED.bio,
    is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed,
    review_count = EXCLUDED.review_count;

  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro3, uid_p3, 'Mechanic',
    'Mobile mechanic for engine diagnostics, brakes, and same-day repairs.',
    'Abuja', '₦10,000', 10000,
    false, true, true, 9.0765, 7.3986,
    0, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_p3)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    profession = EXCLUDED.profession,
    bio = EXCLUDED.bio,
    is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed,
    review_count = EXCLUDED.review_count;

  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro4, uid_p4, 'Massage Therapist',
    'Certified massage therapist focused on deep tissue and full-body relaxation.',
    'Lagos', '₦18,000', 18000,
    true, true, true, 6.4281, 3.4219,
    0, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_p4)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    profession = EXCLUDED.profession,
    bio = EXCLUDED.bio,
    is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed,
    review_count = EXCLUDED.review_count;

  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro5, uid_p5, 'Electrician',
    'Licensed electrician for home wiring, fault finding, and lighting installs.',
    'Port Harcourt', '₦7,500', 7500,
    false, true, true, 4.8156, 7.0498,
    0, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_p5)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    profession = EXCLUDED.profession,
    bio = EXCLUDED.bio,
    is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed,
    review_count = EXCLUDED.review_count;

  INSERT INTO public.professionals (
    id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url
  )
  SELECT pro6, uid_p6, 'Barber',
    'Sharp fades and beard trims with a clean, professional finish every time.',
    'Abuja', '₦4,000', 4000,
    true, true, true, 9.0579, 7.4951,
    0, 2, NULL
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_p6)
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    profession = EXCLUDED.profession,
    bio = EXCLUDED.bio,
    is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed,
    review_count = EXCLUDED.review_count;

  -- ----------------------------------------------------------
  -- SERVICES (exact mock)
  -- ----------------------------------------------------------
  DELETE FROM public.services WHERE professional_id IN (pro1, pro2, pro3, pro4, pro5, pro6);

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
  -- REVIEWS (exact comments; user_id null if reviewer has no profile)
  -- ----------------------------------------------------------
  DELETE FROM public.reviews WHERE professional_id IN (pro1, pro2, pro3, pro4, pro5, pro6);

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
  SELECT pro2, uid_r1, 'Blessing K.', 'Beautiful nails and very careful. Will book again.', '2025-05-05'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro2, uid_r2, 'Amaka R.', 'Very neat work and friendly service.', '2025-04-21'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro3, uid_r3, 'Emeka P.', 'Fixed my car the same day. Fair price.', '2025-05-01'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro3, NULL, 'David O.', 'Explained the problem clearly and completed the repair.', '2025-04-18'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro4, NULL, 'Ngozi M.', 'Very relaxing. Professional and respectful.', '2025-04-20'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro4, NULL, 'Sarah A.', 'Great experience and very comfortable environment.', '2025-04-10'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro5, NULL, 'Ifeanyi D.', 'Quick and safe. Explained everything clearly.', '2025-05-08'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro5, NULL, 'Chinedu K.', 'Very neat electrical work and fair pricing.', '2025-04-25'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro5);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro6, NULL, 'Yusuf H.', 'Clean cut every time. Very professional.', '2025-05-03'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  INSERT INTO public.reviews (professional_id, user_id, user_name, comment, created_at)
  SELECT pro6, NULL, 'Ibrahim S.', 'Great attention to detail and excellent service.', '2025-04-16'
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro6);

  -- ----------------------------------------------------------
  -- BOOKINGS (exact booking.ts)
  -- Booked by u1 | Received by pro1 (John)
  -- ----------------------------------------------------------
  DELETE FROM public.bookings
  WHERE customer_id IN (uid_u1, uid_u2, uid_u3, uid_u4)
     OR professional_id IN (pro1, pro2, pro3, pro4);

  -- Booked (customer = u1)
  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u1, pro2, 'Nail Extension', 'Nail Extension', 'pending',
    15400, 'Lagos', '2025-05-25 10:00:00+01', 4.9, 89
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro2)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u1, pro4, 'Full Body Massage', 'Full Body Massage', 'accepted',
    18000, 'Lagos', '2025-05-22 14:30:00+01', 4.9, 32
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro4)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u1, pro3, 'Car Repair', 'Car Repair', 'declined',
    28000, 'Abuja', '2025-05-18 11:00:00+01', 4.7, 64
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro3)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  -- Received (professional = pro1 / John)
  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u2, pro1, 'House Cleaning', 'House Cleaning', 'pending',
    15400, 'Lagos', '2025-05-28 09:00:00+01', 5.0, 12
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u2);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u3, pro1, 'AC Repair', 'AC Repair', 'accepted',
    22000, 'Lagos', '2025-05-27 14:30:00+01', 4.8, 20
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u3);

  INSERT INTO public.bookings (
    customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count
  )
  SELECT uid_u4, pro1, 'Furniture Assembly', 'Furniture Assembly', 'declined',
    12000, 'Abuja', '2025-05-24 11:00:00+01', 4.9, 8
  WHERE EXISTS (SELECT 1 FROM public.professionals WHERE id = pro1)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u4);

  -- ----------------------------------------------------------
  -- NOTIFICATIONS (for mock user u1)
  -- ----------------------------------------------------------
  DELETE FROM public.notifications WHERE user_id IN (uid_u1, uid_u2);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'booking', 'Booking Update',
    'Your Nail Extension booking is pending confirmation.', true, NOW() - INTERVAL '30 minutes'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'message', 'New Message',
    'You have a new message about your booking.', true, NOW() - INTERVAL '2 hours'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'payment', 'Payment Received',
    'Payment of ₦18,000 was received for Full Body Massage.', false, NOW() - INTERVAL '5 hours'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'verification', 'Verification Update',
    'Your identity verification is under review.', true, NOW() - INTERVAL '1 day'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'review', 'Review Received',
    'You received a new review on your profile.', true, NOW() - INTERVAL '2 days'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u1, 'general', 'Welcome to Doovly',
    'Thanks for joining. Explore services near you.', false, NOW() - INTERVAL '3 days'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u1);

  INSERT INTO public.notifications (user_id, type, title, body, unread, created_at)
  SELECT uid_u2, 'booking', 'Booking Confirmed',
    'Your booking request was sent successfully.', true, NOW() - INTERVAL '1 hour'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = uid_u2);

END $$;

-- ============================================================
-- HOW TO USE
-- ============================================================
-- 1. supabase db reset   (runs migration + seed)
-- 2. Create auth.users with these fixed IDs (or seed skips them):
--
--   u1  11111111-1111-1111-1111-111111111111  John (mock user / pro 1)
--   u2  22222222-2222-2222-2222-222222222222  Ada Okafor (customer)
--   u3  33333333-3333-3333-3333-333333333333  Tunde Adebayo (customer)
--   u4  44444444-4444-4444-4444-444444444444  Chioma Nwosu (customer)
--   p2  b2000000-0000-0000-0000-000000000002  Chioma Eze (pro 2)
--   p3  b2000000-0000-0000-0000-000000000003  Ikechukwu Obi (pro 3)
--   p4  b2000000-0000-0000-0000-000000000004  Blessing Joy (pro 4)
--   p5  b2000000-0000-0000-0000-000000000005  Emeka Okoro (pro 5)
--   p6  b2000000-0000-0000-0000-000000000006  Aisha Bello (pro 6)
--
-- 3. pro UUIDs:
--   "1" → a1000000-0000-0000-0000-000000000001
--   "2" → a1000000-0000-0000-0000-000000000002
--   … through "6"
-- ============================================================
