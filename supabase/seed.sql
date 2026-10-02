-- ============================================================
-- Doovly – Seed data 100% aligned with src/data/* mocks
-- Sources:
--   professionals.ts, booking.ts, serviceRequests.ts,
--   notifications.ts, subscriptionPlans.ts, subscriptions.ts,
--   verificationApplications.ts, adminNotifications.ts,
--   serviceCategories.ts, savedProviders.ts, chat.ts
--
-- ID map (mock → UUID) — also mirrored in src/lib/ids.ts
-- Run: supabase db reset  (migration 001 + 002 + this seed)
-- ============================================================

-- ------------------------------------------------------------
-- 0) AUTH USERS (so profile FKs always succeed locally)
-- Password for all seed users: password123
-- ------------------------------------------------------------
DO $$
DECLARE
  instance UUID := '00000000-0000-0000-0000-000000000000';
  pwd TEXT := crypt('password123', gen_salt('bf'));
  u RECORD;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
      ('11111111-1111-1111-1111-111111111111'::uuid, 'u1',  'john.chukwuemeka@email.com'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'u2',  'ada.okafor@email.com'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'u3',  'tunde.adebayo@email.com'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'u4',  'chioma.nwosu@email.com'),
      ('55555555-5555-5555-5555-555555555555'::uuid, 'u5',  'blessing.k@email.com'),
      ('66666666-6666-6666-6666-666666666666'::uuid, 'u6',  'amaka.r@email.com'),
      ('77777777-7777-7777-7777-777777777777'::uuid, 'u7',  'emeka.p@email.com'),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'u11', 'poster.u11@email.com'),
      ('b2000000-0000-0000-0000-000000000002'::uuid, 'p2',  'chioma.eze@email.com'),
      ('b2000000-0000-0000-0000-000000000003'::uuid, 'p3',  'ikechukwu.obi@email.com'),
      ('b2000000-0000-0000-0000-000000000004'::uuid, 'p4',  'blessing.joy@email.com'),
      ('b2000000-0000-0000-0000-000000000005'::uuid, 'p5',  'emeka.okoro@email.com'),
      ('b2000000-0000-0000-0000-000000000006'::uuid, 'p6',  'aisha.bello@email.com')
    ) AS t(id, mock_id, email)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      instance, u.id, 'authenticated', 'authenticated', u.email, pwd,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('mock_id', u.mock_id),
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = u.id AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        u.id, u.id,
        jsonb_build_object('sub', u.id::text, 'email', u.email),
        'email', u.id::text,
        NOW(), NOW(), NOW()
      );
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'auth.users not present — skip auth seed (profiles still inserted if FKs allow)';
  WHEN OTHERS THEN
    RAISE NOTICE 'auth seed skipped: %', SQLERRM;
END $$;

DO $$
DECLARE
  uid_u1  UUID := '11111111-1111-1111-1111-111111111111';
  uid_u2  UUID := '22222222-2222-2222-2222-222222222222';
  uid_u3  UUID := '33333333-3333-3333-3333-333333333333';
  uid_u4  UUID := '44444444-4444-4444-4444-444444444444';
  uid_u5  UUID := '55555555-5555-5555-5555-555555555555';
  uid_u6  UUID := '66666666-6666-6666-6666-666666666666';
  uid_u7  UUID := '77777777-7777-7777-7777-777777777777';
  uid_u11 UUID := 'a1111111-1111-1111-1111-111111111111';
  uid_p2  UUID := 'b2000000-0000-0000-0000-000000000002';
  uid_p3  UUID := 'b2000000-0000-0000-0000-000000000003';
  uid_p4  UUID := 'b2000000-0000-0000-0000-000000000004';
  uid_p5  UUID := 'b2000000-0000-0000-0000-000000000005';
  uid_p6  UUID := 'b2000000-0000-0000-0000-000000000006';

  pro1 UUID := 'a1000000-0000-0000-0000-000000000001';
  pro2 UUID := 'a1000000-0000-0000-0000-000000000002';
  pro3 UUID := 'a1000000-0000-0000-0000-000000000003';
  pro4 UUID := 'a1000000-0000-0000-0000-000000000004';
  pro5 UUID := 'a1000000-0000-0000-0000-000000000005';
  pro6 UUID := 'a1000000-0000-0000-0000-000000000006';

  b_b1 UUID := 'b1000000-0000-0000-0000-000000000001';
  b_b2 UUID := 'b1000000-0000-0000-0000-000000000002';
  b_b3 UUID := 'b1000000-0000-0000-0000-000000000003';
  b_r1 UUID := 'b1000000-0000-0000-0000-000000000011';
  b_r2 UUID := 'b1000000-0000-0000-0000-000000000012';
  b_r3 UUID := 'b1000000-0000-0000-0000-000000000013';

  sr1  UUID := 'c1000000-0000-0000-0000-000000000001';
  sr2  UUID := 'c1000000-0000-0000-0000-000000000002';
  sr3  UUID := 'c1000000-0000-0000-0000-000000000003';
  sr4  UUID := 'c1000000-0000-0000-0000-000000000004';
  sr5  UUID := 'c1000000-0000-0000-0000-000000000005';
  sr6  UUID := 'c1000000-0000-0000-0000-000000000006';
  sr7  UUID := 'c1000000-0000-0000-0000-000000000007';
  sr11 UUID := 'c1000000-0000-0000-0000-000000000011';

  conv1 UUID := 'd1000000-0000-0000-0000-000000000001';
  conv2 UUID := 'd1000000-0000-0000-0000-000000000002';
  conv3 UUID := 'd1000000-0000-0000-0000-000000000003';
  conv4 UUID := 'd1000000-0000-0000-0000-000000000004';

  plan_basic UUID := 'e1000000-0000-0000-0000-000000000001';
  plan_pro   UUID := 'e1000000-0000-0000-0000-000000000002';

  va1 UUID := 'f1000000-0000-0000-0000-000000000001';
  va2 UUID := 'f1000000-0000-0000-0000-000000000002';
  va3 UUID := 'f1000000-0000-0000-0000-000000000003';
  va4 UUID := 'f1000000-0000-0000-0000-000000000004';
  va5 UUID := 'f1000000-0000-0000-0000-000000000005';
  va6 UUID := 'f1000000-0000-0000-0000-000000000006';
BEGIN
  -- PROFILES
  INSERT INTO public.profiles (
    id, full_name, phone, email, avatar_url, role, city, mock_id,
    is_online, member_since, last_active_at
  ) VALUES
    (uid_u1,  'John Chukwuemeka', '+234 803 111 2201', 'john.chukwuemeka@email.com', NULL, 'admin', 'Lagos', 'u1', true,  '2025-01-12', NOW() - INTERVAL '2 hours'),
    (uid_u2,  'Ada Okafor',       '+2348000000002',    'ada.okafor@email.com',       NULL, 'user',  'Lagos', 'u2', false, '2025-02-03', NOW() - INTERVAL '5 hours'),
    (uid_u3,  'Tunde Adebayo',    '+2348000000003',    'tunde.adebayo@email.com',    NULL, 'user',  'Lagos', 'u3', false, '2025-03-18', NOW() - INTERVAL '1 day'),
    (uid_u4,  'Chioma Nwosu',     '+2348000000004',    'chioma.nwosu@email.com',     NULL, 'user',  'Lagos', 'u4', false, '2025-04-05', NOW() - INTERVAL '3 days'),
    (uid_u5,  'Blessing K.',      '+2348000000005',    'blessing.k@email.com',       NULL, 'user',  'Lagos', 'u5', false, '2025-05-22', NOW() - INTERVAL '1 week'),
    (uid_u6,  'Amaka R.',         '+2348000000006',    'amaka.r@email.com',          NULL, 'user',  'Lagos', 'u6', false, '2025-06-10', NOW() - INTERVAL '2 days'),
    (uid_u7,  'Emeka P.',         '+2348000000007',    'emeka.p@email.com',          NULL, 'user',  'Abuja', 'u7', false, '2025-06-15', NOW() - INTERVAL '4 days'),
    (uid_u11, 'Blessing Joy',     '+234 806 444 5504', 'poster.u11@email.com',       NULL, 'user',  'Lagos', 'u11', false, '2025-04-05', NOW() - INTERVAL '1 day'),
    (uid_p2,  'Chioma Eze',       '+234 802 222 3302', 'chioma.eze@email.com',       NULL, 'professional', 'Lagos', 'p2', true,  '2025-02-03', NOW() - INTERVAL '5 hours'),
    (uid_p3,  'Ikechukwu Obi',    '+234 805 333 4403', 'ikechukwu.obi@email.com',    NULL, 'professional', 'Abuja', 'p3', false, '2025-03-18', NOW() - INTERVAL '1 day'),
    (uid_p4,  'Blessing Joy',     '+234 806 444 5504', 'blessing.joy@email.com',     NULL, 'professional', 'Lagos', 'p4', true,  '2025-04-05', NOW() - INTERVAL '3 days'),
    (uid_p5,  'Emeka Okoro',      '+234 807 555 6605', 'emeka.okoro@email.com',      NULL, 'professional', 'Port Harcourt', 'p5', false, '2025-05-22', NOW() - INTERVAL '1 week'),
    (uid_p6,  'Aisha Bello',      '+234 809 666 7706', 'aisha.bello@email.com',      NULL, 'professional', 'Abuja', 'p6', true,  '2025-06-10', NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, email = EXCLUDED.email,
    role = EXCLUDED.role, city = EXCLUDED.city, mock_id = EXCLUDED.mock_id,
    is_online = EXCLUDED.is_online, member_since = EXCLUDED.member_since,
    last_active_at = EXCLUDED.last_active_at;

  -- PROFESSIONALS
  INSERT INTO public.professionals (
    id, mock_id, user_id, profession, bio, city, price_from, price_from_value,
    is_verified, is_available, subscribed, latitude, longitude,
    rating, review_count, avatar_url, email, phone
  ) VALUES
    (pro1, '1', uid_u1, 'Plumber', 'Experienced plumber with 8+ years fixing residential and commercial systems across Lagos.', 'Lagos', '₦8,000', 8000, true, true, false, 6.5244, 3.3792, 0, 3, 'mock://profile_1.jpg', 'john.chukwuemeka@email.com', '+234 803 111 2201'),
    (pro2, '2', uid_p2, 'Nail Tech', 'Creative nail tech specializing in gel extensions and bridal nail art.', 'Lagos', '₦6,000', 6000, true, true, true, 6.6018, 3.3515, 0, 2, 'mock://profile_2.jpg', 'chioma.eze@email.com', '+234 802 222 3302'),
    (pro3, '3', uid_p3, 'Mechanic', 'Mobile mechanic for engine diagnostics, brakes, and same-day repairs.', 'Abuja', '₦10,000', 10000, false, true, true, 9.0765, 7.3986, 0, 2, 'mock://profile_3.jpg', 'ikechukwu.obi@email.com', '+234 805 333 4403'),
    (pro4, '4', uid_p4, 'Massage Therapist', 'Certified massage therapist focused on deep tissue and full-body relaxation.', 'Lagos', '₦18,000', 18000, true, true, true, 6.4281, 3.4219, 0, 2, 'mock://profile_4.jpg', 'blessing.joy@email.com', '+234 806 444 5504'),
    (pro5, '5', uid_p5, 'Electrician', 'Licensed electrician for home wiring, fault finding, and lighting installs.', 'Port Harcourt', '₦7,500', 7500, false, true, true, 4.8156, 7.0498, 0, 2, 'mock://profile_1.jpg', 'emeka.okoro@email.com', '+234 807 555 6605'),
    (pro6, '6', uid_p6, 'Barber', 'Sharp fades and beard trims with a clean, professional finish every time.', 'Abuja', '₦4,000', 4000, true, true, true, 9.0579, 7.4951, 0, 2, 'mock://profile_2.jpg', 'aisha.bello@email.com', '+234 809 666 7706')
  ON CONFLICT (id) DO UPDATE SET
    mock_id = EXCLUDED.mock_id, user_id = EXCLUDED.user_id, profession = EXCLUDED.profession,
    bio = EXCLUDED.bio, city = EXCLUDED.city, price_from = EXCLUDED.price_from,
    price_from_value = EXCLUDED.price_from_value, is_verified = EXCLUDED.is_verified,
    subscribed = EXCLUDED.subscribed, review_count = EXCLUDED.review_count,
    avatar_url = EXCLUDED.avatar_url, email = EXCLUDED.email, phone = EXCLUDED.phone;

  DELETE FROM public.services WHERE professional_id IN (pro1, pro2, pro3, pro4, pro5, pro6);
  INSERT INTO public.services (professional_id, mock_id, name, description, price, price_value, icon) VALUES
    (pro1, 's1', 'Plumbing Installation', 'Professional installation of pipes, taps, fixtures and fittings.', '₦8,000', 8000, 'pipe'),
    (pro1, 's2', 'Drain Cleaning', 'Professional drain cleaning and blockage removal.', '₦10,000', 10000, 'pipe-leak'),
    (pro1, 's3', 'Water Heater Repair', 'Repair and maintenance of electric and gas water heaters.', '₦12,000', 12000, 'water-boiler'),
    (pro2, 's1', 'Nail Extension', 'Acrylic and gel nail extensions with custom designs.', '₦6,000', 6000, 'nail'),
    (pro2, 's2', 'Manicure & Pedicure', 'Complete manicure and pedicure treatment.', '₦8,000', 8000, 'hand-okay'),
    (pro2, 's3', 'Nail Art', 'Creative nail art and detailed custom designs.', '₦4,000', 4000, 'brush'),
    (pro3, 's1', 'Engine Diagnostics', 'Complete engine inspection and fault diagnosis.', '₦10,000', 10000, 'car-wrench'),
    (pro3, 's2', 'Oil Change', 'Engine oil and filter replacement service.', '₦15,000', 15000, 'oil'),
    (pro3, 's3', 'Brake Repair', 'Brake inspection, repair and replacement.', '₦12,000', 12000, 'car-brake-alert'),
    (pro4, 's1', 'Full Body Massage', 'Relaxing full body massage session lasting 60–90 minutes.', '₦18,000', 18000, 'spa'),
    (pro4, 's2', 'Deep Tissue Massage', 'Focused massage designed for muscle tension and relaxation.', '₦22,000', 22000, 'hand-back-right'),
    (pro5, 's1', 'Wiring & Installation', 'Home and office electrical wiring and installations.', '₦7,500', 7500, 'flash'),
    (pro5, 's2', 'Fault Finding', 'Diagnose and repair electrical faults safely.', '₦9,000', 9000, 'lightning-bolt'),
    (pro5, 's3', 'Lighting Installation', 'Indoor and outdoor lighting installation.', '₦6,000', 6000, 'lightbulb'),
    (pro6, 's1', 'Haircut', 'Classic and modern haircuts for men.', '₦4,000', 4000, 'content-cut'),
    (pro6, 's2', 'Beard Trim', 'Professional beard shaping and trimming.', '₦2,500', 2500, 'mustache'),
    (pro6, 's3', 'Haircut & Beard', 'Complete haircut and beard grooming package.', '₦6,000', 6000, 'face-man');

  DELETE FROM public.portfolio_items WHERE professional_id IN (pro1, pro2, pro3, pro4, pro5, pro6);
  INSERT INTO public.portfolio_items (professional_id, mock_id, description, image_key, image_url, sort_order) VALUES
    (pro1, 'p1', 'Installed new kitchen pipes, taps and drainage connections.', 'profile_1', 'mock://profile_1.jpg', 1),
    (pro1, 'p2', 'Completed a full bathroom plumbing installation.', 'profile_3', 'mock://profile_3.jpg', 2),
    (pro1, 'p3', 'Installed and tested a residential water heating system.', 'profile_4', 'mock://profile_4.jpg', 3),
    (pro1, 'p4', 'Removed blockage and restored proper drainage flow.', 'profile_2', 'mock://profile_2.jpg', 4),
    (pro2, 'p1', 'Elegant gel nails with a clean modern finish.', 'profile_2', 'mock://profile_2.jpg', 1),
    (pro2, 'p2', 'Classic French tip design with a polished finish.', 'profile_4', 'mock://profile_4.jpg', 2),
    (pro2, 'p3', 'Custom bridal nail design with detailed decoration.', 'profile_1', 'mock://profile_1.jpg', 3),
    (pro2, 'p4', 'Premium nail art with custom patterns and finishing.', 'profile_3', 'mock://profile_3.jpg', 4),
    (pro3, 'p1', 'Diagnosed and repaired a vehicle engine fault.', 'profile_3', 'mock://profile_3.jpg', 1),
    (pro3, 'p2', 'Completed brake inspection and replacement.', 'profile_1', 'mock://profile_1.jpg', 2),
    (pro3, 'p3', 'Performed full oil and filter replacement.', 'profile_4', 'mock://profile_4.jpg', 3),
    (pro3, 'p4', 'Identified and resolved multiple dashboard fault codes.', 'profile_2', 'mock://profile_2.jpg', 4),
    (pro4, 'p1', 'Completed a relaxing full body massage session.', 'profile_4', 'mock://profile_4.jpg', 1),
    (pro4, 'p2', 'Provided targeted deep tissue massage treatment.', 'profile_2', 'mock://profile_2.jpg', 2),
    (pro4, 'p3', 'Created a calming wellness session for a returning client.', 'profile_1', 'mock://profile_1.jpg', 3),
    (pro4, 'p4', 'Delivered a personalized relaxation and wellness treatment.', 'profile_3', 'mock://profile_3.jpg', 4),
    (pro5, 'p1', 'Completed electrical wiring for a residential property.', 'profile_1', 'mock://profile_1.jpg', 1),
    (pro5, 'p2', 'Installed modern lighting throughout a home.', 'profile_3', 'mock://profile_3.jpg', 2),
    (pro5, 'p3', 'Diagnosed and repaired multiple electrical faults.', 'profile_2', 'mock://profile_2.jpg', 3),
    (pro5, 'p4', 'Completed electrical installation for a small office.', 'profile_4', 'mock://profile_4.jpg', 4),
    (pro6, 'p1', 'Clean classic fade with a sharp professional finish.', 'profile_2', 'mock://profile_2.jpg', 1),
    (pro6, 'p2', 'Detailed beard shaping and grooming service.', 'profile_4', 'mock://profile_4.jpg', 2),
    (pro6, 'p3', 'Modern low fade with a clean line-up.', 'profile_1', 'mock://profile_1.jpg', 3),
    (pro6, 'p4', 'Complete haircut, beard trim and styling.', 'profile_3', 'mock://profile_3.jpg', 4);

  DELETE FROM public.reviews WHERE professional_id IN (pro1, pro2, pro3, pro4, pro5, pro6);
  INSERT INTO public.reviews (professional_id, mock_id, user_id, user_name, comment, display_date, created_at) VALUES
    (pro1, 'r1', uid_u2, 'Ada O.', 'Very professional and on time. Fixed my kitchen sink perfectly.', 'May 10, 2025', '2025-05-10'),
    (pro1, 'r2', uid_u3, 'Tunde A.', 'Honest pricing and clean work. Highly recommended.', 'Apr 28, 2025', '2025-04-28'),
    (pro1, 'r3', uid_u4, 'Chioma N.', 'Good job overall. The quality of the work was excellent.', 'Apr 12, 2025', '2025-04-12'),
    (pro2, 'r1', uid_u5, 'Blessing K.', 'Beautiful nails and very careful. Will book again.', 'May 5, 2025', '2025-05-05'),
    (pro2, 'r2', uid_u6, 'Amaka R.', 'Very neat work and friendly service.', 'Apr 21, 2025', '2025-04-21'),
    (pro3, 'r1', uid_u7, 'Emeka P.', 'Fixed my car the same day. Fair price.', 'May 1, 2025', '2025-05-01'),
    (pro3, 'r2', uid_u2, 'David O.', 'Explained the problem clearly and completed the repair.', 'Apr 18, 2025', '2025-04-18'),
    (pro4, 'r1', uid_u3, 'Ngozi M.', 'Very relaxing. Professional and respectful.', 'Apr 20, 2025', '2025-04-20'),
    (pro4, 'r2', uid_u4, 'Sarah A.', 'Great experience and very comfortable environment.', 'Apr 10, 2025', '2025-04-10'),
    (pro5, 'r1', uid_u5, 'Ifeanyi D.', 'Quick and safe. Explained everything clearly.', 'May 8, 2025', '2025-05-08'),
    (pro5, 'r2', uid_u6, 'Chinedu K.', 'Very neat electrical work and fair pricing.', 'Apr 25, 2025', '2025-04-25'),
    (pro6, 'r1', uid_u7, 'Yusuf H.', 'Clean cut every time. Very professional.', 'May 3, 2025', '2025-05-03'),
    (pro6, 'r2', uid_u2, 'Ibrahim S.', 'Great attention to detail and excellent service.', 'Apr 16, 2025', '2025-04-16');

  DELETE FROM public.bookings WHERE mock_id IS NOT NULL OR id IN (b_b1, b_b2, b_b3, b_r1, b_r2, b_r3);
  INSERT INTO public.bookings (
    id, mock_id, customer_id, professional_id, title, service_name, status,
    amount, location, scheduled_at, rating, reviews_count, display_date,
    professional_name, customer_name, professional_verified
  ) VALUES
    (b_b1, 'b1', uid_u1, pro2, 'Nail Extension', 'Nail Extension', 'pending', 15400, 'Lagos', '2025-05-25 10:00:00+01', 4.9, 89, 'May 25, 2025 10:00 AM', 'Chioma Eze', 'You', true),
    (b_b2, 'b2', uid_u1, pro4, 'Full Body Massage', 'Full Body Massage', 'accepted', 18000, 'Lagos', '2025-05-22 14:30:00+01', 4.9, 32, 'May 22, 2025 02:30 PM', 'Blessing Joy', 'You', true),
    (b_b3, 'b3', uid_u1, pro3, 'Car Repair', 'Car Repair', 'declined', 28000, 'Abuja', '2025-05-18 11:00:00+01', 4.7, 64, 'May 18, 2025 11:00 AM', 'Ikechukwu Obi', 'You', false),
    (b_r1, 'r1', uid_u2, pro1, 'House Cleaning', 'House Cleaning', 'pending', 15400, 'Lagos', '2025-05-28 09:00:00+01', 5.0, 12, 'May 28, 2025 09:00 AM', 'John Chukwuemeka', 'Ada Okafor', true),
    (b_r2, 'r2', uid_u3, pro1, 'AC Repair', 'AC Repair', 'accepted', 22000, 'Lagos', '2025-05-27 14:30:00+01', 4.8, 20, 'May 27, 2025 02:30 PM', 'John Chukwuemeka', 'Tunde Adebayo', true),
    (b_r3, 'r3', uid_u4, pro1, 'Furniture Assembly', 'Furniture Assembly', 'declined', 12000, 'Abuja', '2025-05-24 11:00:00+01', 4.9, 8, 'May 24, 2025 11:00 AM', 'John Chukwuemeka', 'Chioma Nwosu', true);

  DELETE FROM public.service_categories;
  INSERT INTO public.service_categories (mock_id, name, icon, sort_order) VALUES
    ('plumber', 'Plumber', 'water-pump', 1),
    ('electrician', 'Electrician', 'flash', 2),
    ('barber', 'Barber', 'content-cut', 3),
    ('nail-tech', 'Nail Tech', 'hand-okay', 4),
    ('mechanic', 'Mechanic', 'car-wrench', 5),
    ('spa', 'Spa', 'spa', 6);

  DELETE FROM public.service_request_comments WHERE true;
  DELETE FROM public.service_request_offers WHERE true;
  DELETE FROM public.service_requests WHERE true;

  INSERT INTO public.service_requests (
    id, mock_id, title, category, profession, location, city, description,
    icon, icon_background, images, image_keys, is_new, created_by,
    poster_name, poster_avatar_url, poster_verified,
    likes_count, max_offers, offers_count, offered_by,
    latitude, longitude, time_ago, created_at
  ) VALUES
    (sr1, '1', 'Leaking pipe in bathroom', 'Plumbing', 'Plumber', 'Victoria Island', 'Lagos',
      'Bathroom pipe is leaking under the sink. Need someone experienced who can fix it today if possible.',
      'water-pump', '#FFF1D5', '{}', ARRAY['profile_1','profile_3','profile_2','profile_4'],
      true, uid_u2, 'Amaka O.', 'mock://profile_2.jpg', true, 14, 3, 1, ARRAY[uid_u1],
      6.4281, 3.4219, '2 min ago', NOW() - INTERVAL '2 minutes'),
    (sr2, '2', 'Need electrician to fix power', 'Electrical', 'Electrician', 'Lekki Phase 1', 'Lagos',
      'Power keeps tripping in the living room. Looking for a licensed electrician to diagnose and fix.',
      'flash', '#DDF2FF', '{}', ARRAY['profile_3','profile_1','profile_4'],
      true, uid_u3, 'Emeka Okoro', 'mock://profile_1.jpg', false, 9, 5, 0, '{}',
      6.4474, 3.4722, '5 min ago', NOW() - INTERVAL '5 minutes'),
    (sr3, '3', 'Car needs urgent repair', 'Mechanic', 'Mechanic', 'Ikoyi', 'Lagos',
      'Engine warning light is on and the car is making a strange noise. Need a reliable mechanic ASAP.',
      'car-wrench', '#E9E1FF', '{}', ARRAY['profile_3','profile_4'],
      true, uid_u4, 'Ikechukwu Obi', 'mock://profile_3.jpg', false, 31, 5, 0, '{}',
      6.4541, 3.4316, '8 min ago', NOW() - INTERVAL '8 minutes'),
    (sr4, '4', 'Haircut and beard trim', 'Barber', 'Barber', 'Garki', 'Abuja',
      'Looking for a clean haircut and beard trim. Prefer someone who can come to my location.',
      'content-cut', '#E8F5E9', '{}', ARRAY['profile_2'],
      false, uid_u5, 'Aisha Bello', 'mock://profile_2.jpg', true, 6, 5, 0, '{}',
      9.0579, 7.4951, '12 min ago', NOW() - INTERVAL '12 minutes'),
    (sr5, '5', 'Gel nails and manicure', 'Nail Tech', 'Nail Tech', 'Surulere', 'Lagos',
      'Need gel nails and a full manicure. Looking for a neat and experienced nail tech.',
      'nail', '#FCE4EC', '{}', ARRAY['profile_2','profile_4','profile_1'],
      false, uid_u6, 'Chioma Eze', 'mock://profile_2.jpg', true, 18, 5, 0, '{}',
      6.4969, 3.3481, '20 min ago', NOW() - INTERVAL '20 minutes'),
    (sr6, '6', 'House wiring check', 'Electrical', 'Electrician', 'GRA', 'Port Harcourt',
      'Need a full house wiring safety check. Some outlets are warm and lights flicker.',
      'flash', '#DDF2FF', '{}', ARRAY['profile_1','profile_3'],
      false, uid_u7, 'Emeka Okoro', 'mock://profile_1.jpg', false, 4, 5, 0, '{}',
      4.8156, 7.0498, '25 min ago', NOW() - INTERVAL '25 minutes'),
    (sr7, '7', 'Blocked kitchen sink', 'Plumbing', 'Plumber', 'Wuse 2', 'Abuja',
      'Kitchen sink is fully blocked. Need a plumber who can clear it and check the pipes.',
      'water-pump', '#FFF1D5', '{}', ARRAY['profile_1','profile_3','profile_4','profile_2'],
      true, uid_u1, 'John Chukwuemeka', 'mock://profile_1.jpg', false, 11, 5, 0, '{}',
      9.0765, 7.3986, '30 min ago', NOW() - INTERVAL '30 minutes'),
    (sr11, '11', 'Home Cleaning Needed', 'Cleaning', 'Cleaner', 'Lekki Phase 1', 'Lagos',
      'Looking for a reliable cleaner to deep clean my 2 bedroom apartment. Must bring own equipment.',
      'broom', '#D1FAE5', '{}', ARRAY['profile_4','profile_2','profile_1'],
      true, uid_u11, 'Blessing Joy', 'mock://profile_4.jpg', true, 22, 5, 0, '{}',
      6.4474, 3.4722, '2h ago', NOW() - INTERVAL '2 hours');

  INSERT INTO public.service_request_offers (request_id, user_id, amount, message, status)
  VALUES (sr1, uid_u1, NULL, 'I can come today after 3pm. DM me.', 'pending');

  INSERT INTO public.service_request_comments (
    request_id, mock_id, user_id, user_name, user_avatar_url, text, time_ago, created_at
  ) VALUES
    (sr1, 'c1', uid_u1, 'John Chukwuemeka', 'mock://profile_1.jpg', 'I can come today after 3pm. DM me.', '1 min ago', NOW() - INTERVAL '1 minute'),
    (sr3, 'c2', uid_u5, 'Emeka Okoro', 'mock://profile_1.jpg', 'We can tow and diagnose same day.', '3 min ago', NOW() - INTERVAL '3 minutes'),
    (sr5, 'c3', uid_u4, 'Blessing Joy', 'mock://profile_4.jpg', 'I have slots tomorrow afternoon!', '10 min ago', NOW() - INTERVAL '10 minutes'),
    (sr11, 'c4', uid_u2, 'Chioma Eze', 'mock://profile_2.jpg', 'I''m available for this. I have 4 years experience in home cleaning.', '1h ago', NOW() - INTERVAL '1 hour'),
    (sr11, 'c5', uid_u6, 'Aisha Bello', 'mock://profile_2.jpg', 'Can do this weekend if still open.', '45 min ago', NOW() - INTERVAL '45 minutes');

  DELETE FROM public.notifications;
  INSERT INTO public.notifications (mock_id, user_id, type, title, body, unread, time_label, created_at) VALUES
    ('n1', uid_u1, 'booking', 'Booking Confirmed', 'Your booking with Tunde Electrician has been confirmed.', true, '2 min ago', NOW() - INTERVAL '2 minutes'),
    ('n2', uid_u1, 'upcoming', 'Upcoming Booking', 'You have a booking with Bright Cleaning scheduled for tomorrow at 10:00 AM.', true, '25 min ago', NOW() - INTERVAL '25 minutes'),
    ('n3', uid_u1, 'message', 'New Message', 'You have a new message from Sarah Makeover.', true, '1 hr ago', NOW() - INTERVAL '1 hour'),
    ('n4', uid_u1, 'payment', 'Payment Successful', 'Your payment of ₦15,000 was successful.', true, '3 hrs ago', NOW() - INTERVAL '3 hours'),
    ('n5', uid_u1, 'verification', 'Verification Update', 'Your identity verification is under review.', true, '1 day ago', NOW() - INTERVAL '1 day'),
    ('n6', uid_u1, 'review', 'Review Received', 'You received a 5-star review from John Doe.', true, '2 days ago', NOW() - INTERVAL '2 days'),
    ('n7', uid_u1, 'general', 'Welcome to Doovly', 'Thanks for joining. Explore services near you.', false, '3 days ago', NOW() - INTERVAL '3 days'),
    ('n8', uid_u2, 'booking', 'Booking Confirmed', 'Your booking with Chioma Plumber has been confirmed.', true, '1 hr ago', NOW() - INTERVAL '1 hour'),
    ('n9', uid_u2, 'general', 'Tip', 'Complete your profile to get more bookings.', true, '2 days ago', NOW() - INTERVAL '2 days');

  DELETE FROM public.saved_providers WHERE user_id = uid_u1;
  INSERT INTO public.saved_providers (user_id, professional_id) VALUES (uid_u1, pro1), (uid_u1, pro2);

  DELETE FROM public.messages WHERE true;
  DELETE FROM public.conversation_reads WHERE true;
  DELETE FROM public.conversations WHERE true;

  INSERT INTO public.conversations (id, mock_id, participant_a, participant_b, last_message, last_message_at) VALUES
    (conv1, 'c1', uid_u1, uid_p2, 'Hi! Is the dresser still available?', NOW() - INTERVAL '30 minutes'),
    (conv2, 'c2', uid_u1, uid_p3, 'Thanks! Can we meet this weekend?', NOW() - INTERVAL '48 minutes'),
    (conv3, 'c3', uid_u1, uid_p4, 'The plant pots are ready for pickup 😊', NOW() - INTERVAL '1 day'),
    (conv4, 'c4', uid_u1, uid_p5, 'Sounds good! See you then.', NOW() - INTERVAL '1 day');

  INSERT INTO public.conversation_reads (conversation_id, user_id, unread_count) VALUES
    (conv1, uid_u1, 2), (conv2, uid_u1, 1), (conv3, uid_u1, 3), (conv4, uid_u1, 0),
    (conv1, uid_p2, 0), (conv2, uid_p3, 0), (conv3, uid_p4, 0), (conv4, uid_p5, 0);

  INSERT INTO public.messages (conversation_id, mock_id, sender_id, text, kind, created_at) VALUES
    (conv1, 'm1', uid_u1, 'Hi Chioma, thank you for connecting.', 'text', NOW() - INTERVAL '32 minutes'),
    (conv1, 'm2', uid_p2, 'Hi! Thanks for reaching out.', 'text', NOW() - INTERVAL '30 minutes'),
    (conv2, 'm1', uid_p3, 'Thanks! Can we meet this weekend?', 'text', NOW() - INTERVAL '48 minutes'),
    (conv3, 'm1', uid_p4, 'The plant pots are ready for pickup 😊', 'text', NOW() - INTERVAL '1 day'),
    (conv4, 'm1', uid_u1, 'Sounds good! See you then.', 'text', NOW() - INTERVAL '1 day');

  DELETE FROM public.subscription_plan_features WHERE true;
  DELETE FROM public.subscription_plans WHERE true;
  DELETE FROM public.subscription_plan_meta WHERE true;

  INSERT INTO public.subscription_plans (id, mock_id, name, tagline, monthly_price, yearly_price, popular, sort_order) VALUES
    (plan_basic, 'basic', 'Basic', 'Get started for free', 0, 0, false, 1),
    (plan_pro, 'pro', 'Pro', 'Unlock more opportunities', 2500, 25000, true, 2);

  INSERT INTO public.subscription_plan_features (plan_id, mock_id, label, sort_order) VALUES
    (plan_basic, 'b1', 'Basic profile', 1),
    (plan_basic, 'b2', 'Browse service requests', 2),
    (plan_basic, 'b3', 'Limited applications (5 per month)', 3),
    (plan_basic, 'b4', 'Basic job filters', 4),
    (plan_basic, 'b5', 'Community support', 5),
    (plan_pro, 'p1', 'Verified / featured profile', 1),
    (plan_pro, 'p2', 'Unlimited applications', 2),
    (plan_pro, 'p3', 'Advanced job filters', 3),
    (plan_pro, 'p4', 'Priority nearby job alerts', 4),
    (plan_pro, 'p5', 'Earnings & performance dashboard', 5),
    (plan_pro, 'p6', 'Portfolio boost', 6),
    (plan_pro, 'p7', 'Dedicated support', 7);

  INSERT INTO public.subscription_plan_meta (promo_title, promo_subtitle, yearly_save_percent)
  VALUES ('Unlock more opportunities', 'Upgrade to get advanced tools, more visibility and grow your business faster.', 17);

  DELETE FROM public.professional_subscriptions WHERE true;
  INSERT INTO public.professional_subscriptions (
    mock_id, professional_id, plan_id, plan_code, status, status_label, start_date, end_date
  ) VALUES
    ('sub-1', pro1, plan_basic, 'free', 'active', 'Joined Oct 15, 2025', '2025-10-15', NULL),
    ('sub-2', pro2, plan_pro, 'pro', 'active', 'Renews Oct 10, 2026', '2025-10-10', '2026-10-10'),
    ('sub-3', pro3, plan_pro, 'pro', 'active', 'Renews Oct 5, 2026', '2025-10-05', '2026-10-05'),
    ('sub-4', pro4, plan_pro, 'pro', 'active', 'Renews Sep 30, 2026', '2025-09-30', '2026-09-30'),
    ('sub-5', pro5, plan_pro, 'pro', 'expired', 'Expired Aug 12, 2026', '2025-09-25', '2026-08-12'),
    ('sub-6', pro6, plan_pro, 'pro', 'active', 'Renews Sep 20, 2026', '2025-09-20', '2026-09-20');

  DELETE FROM public.verification_documents WHERE true;
  DELETE FROM public.verification_applications WHERE true;

  INSERT INTO public.verification_applications (id, mock_id, professional_id, status, submitted_on, email, phone) VALUES
    (va1, 'va-1', pro1, 'verified', '2025-01-12', 'john.chukwuemeka@email.com', '+234 803 111 2201'),
    (va2, 'va-2', pro2, 'verified', '2025-01-09', 'chioma.eze@email.com', '+234 802 222 3302'),
    (va3, 'va-3', pro3, 'pending',  '2025-01-06', 'ikechukwu.obi@email.com', '+234 805 333 4403'),
    (va4, 'va-4', pro4, 'verified', '2025-01-03', 'blessing.joy@email.com', '+234 806 444 5504'),
    (va5, 'va-5', pro5, 'pending',  '2024-12-31', 'emeka.okoro@email.com', '+234 807 555 6605'),
    (va6, 'va-6', pro6, 'verified', '2024-12-28', 'aisha.bello@email.com', '+234 809 666 7706');

  INSERT INTO public.verification_documents (application_id, mock_id, title, file_name, doc_type, uploaded, preview_key, file_url) VALUES
    (va1, 'va-1-gov', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_1', 'mock://profile_1.jpg'),
    (va1, 'va-1-lic', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_1', 'mock://profile_1.jpg'),
    (va1, 'va-1-cert', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_1', 'mock://profile_1.jpg'),
    (va1, 'va-1-photo', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_1', 'mock://profile_1.jpg'),
    (va2, 'va-2-gov', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_2', 'mock://profile_2.jpg'),
    (va2, 'va-2-lic', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_2', 'mock://profile_2.jpg'),
    (va2, 'va-2-cert', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_2', 'mock://profile_2.jpg'),
    (va2, 'va-2-photo', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_2', 'mock://profile_2.jpg'),
    (va3, 'va-3-gov', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_3', 'mock://profile_3.jpg'),
    (va3, 'va-3-lic', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_3', 'mock://profile_3.jpg'),
    (va3, 'va-3-cert', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_3', 'mock://profile_3.jpg'),
    (va3, 'va-3-photo', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_3', 'mock://profile_3.jpg'),
    (va4, 'va-4-gov', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_4', 'mock://profile_4.jpg'),
    (va4, 'va-4-lic', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_4', 'mock://profile_4.jpg'),
    (va4, 'va-4-cert', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_4', 'mock://profile_4.jpg'),
    (va4, 'va-4-photo', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_4', 'mock://profile_4.jpg'),
    (va5, 'va-5-gov', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_1', 'mock://profile_1.jpg'),
    (va5, 'va-5-lic', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_1', 'mock://profile_1.jpg'),
    (va5, 'va-5-cert', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_1', 'mock://profile_1.jpg'),
    (va5, 'va-5-photo', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_1', 'mock://profile_1.jpg'),
    (va6, 'va-6-gov', 'Government ID', 'government_id.pdf', 'pdf', true, 'profile_2', 'mock://profile_2.jpg'),
    (va6, 'va-6-lic', 'Professional License', 'professional_license.pdf', 'pdf', true, 'profile_2', 'mock://profile_2.jpg'),
    (va6, 'va-6-cert', 'Professional Certificate', 'certificate.pdf', 'pdf', true, 'profile_2', 'mock://profile_2.jpg'),
    (va6, 'va-6-photo', 'Profile Photo', 'profile_photo.jpg', 'image', true, 'profile_2', 'mock://profile_2.jpg');

  DELETE FROM public.admin_notifications WHERE true;
  INSERT INTO public.admin_notifications (mock_id, title, message, channels, sent_to, sent_to_label, status, sent_at) VALUES
    ('n1', 'New Feature Available', 'Check out our latest features and improvements on the platform.', ARRAY['in-app','email','sms'], 'all', 'All Users', 'sent', '2026-09-30 10:45:00+01'),
    ('n2', 'Service Request Alert', 'There are new service requests waiting for professionals.', ARRAY['in-app'], 'verified', 'Verified Users', 'sent', '2026-09-29 14:15:00+01'),
    ('n3', 'Subscription Offer', 'Upgrade to Pro and get exclusive benefits this month.', ARRAY['in-app','email','sms'], 'subscribed', 'Subscribed Users', 'sent', '2026-09-28 09:30:00+01'),
    ('n4', 'Account Verification', 'Your verification documents have been received and are under review.', ARRAY['email','sms'], 'free', 'Free Users', 'sent', '2026-09-27 16:10:00+01'),
    ('n5', 'Payment Confirmation', 'Your payment of ₦2,500 has been successfully processed.', ARRAY['in-app','email'], 'all', 'All Users', 'sent', '2026-09-26 11:20:00+01'),
    ('n6', 'System Maintenance', 'Our platform will be down for scheduled maintenance on Oct 5.', ARRAY['in-app','email','sms'], 'all', 'All Users', 'scheduled', '2026-09-24 08:00:00+01');

END $$;

-- HOW TO USE
-- 1. supabase db reset
-- 2. Seed users password: password123
-- 3. mock_id columns match src/data string ids (src/lib/ids.ts)
-- 4. mock://profile_N.jpg → replace with Cloudinary URLs on API swap
-- 5. Booking status lowercase in DB; map with src/lib/mappers.ts
