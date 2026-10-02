-- ============================================================
-- Doovly 
-- Run AFTER migrations/001_schema.sql
-- All seed logins password: password123
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== AUTH USERS ==========
DO $auth$
DECLARE
  v_pw TEXT := crypt('password123', gen_salt('bf'));
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('11111111-1111-1111-1111-111111111111'::uuid, 'john@doovly.test', 'John Chukwuemeka', 'admin', 'Lagos', 'u1'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'ada@doovly.test', 'Ada Okafor', 'user', 'Lagos', 'u2'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'tunde@doovly.test', 'Tunde Adebayo', 'user', 'Lagos', 'u3'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'chioma.nwosu@doovly.test', 'Chioma Nwosu', 'user', 'Lagos', 'u4'),
      ('55555555-5555-5555-5555-555555555555'::uuid, 'blessing.k@doovly.test', 'Blessing K.', 'user', 'Lagos', 'u5'),
      ('66666666-6666-6666-6666-666666666666'::uuid, 'amaka.r@doovly.test', 'Amaka R.', 'user', 'Lagos', 'u6'),
      ('77777777-7777-7777-7777-777777777777'::uuid, 'emeka.p@doovly.test', 'Emeka P.', 'user', 'Abuja', 'u7'),
      ('a1111111-1111-1111-1111-111111111111'::uuid, 'poster@doovly.test', 'Blessing Joy (poster)', 'user', 'Lagos', 'u11'),
      ('b2000000-0000-0000-0000-000000000002'::uuid, 'chioma.eze@doovly.test', 'Chioma Eze', 'professional', 'Lagos', 'p2'),
      ('b2000000-0000-0000-0000-000000000003'::uuid, 'ikechukwu@doovly.test', 'Ikechukwu Obi', 'professional', 'Abuja', 'p3'),
      ('b2000000-0000-0000-0000-000000000004'::uuid, 'blessing.joy@doovly.test', 'Blessing Joy', 'professional', 'Lagos', 'p4'),
      ('b2000000-0000-0000-0000-000000000005'::uuid, 'emeka.okoro@doovly.test', 'Emeka Okoro', 'professional', 'Port Harcourt', 'p5'),
      ('b2000000-0000-0000-0000-000000000006'::uuid, 'aisha@doovly.test', 'Aisha Bello', 'professional', 'Abuja', 'p6')
    ) AS t(id, email, full_name, role, city, mock_id)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = r.id) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated',
        r.email, v_pw, NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', r.full_name, 'role', r.role, 'city', r.city, 'mock_id', r.mock_id),
        NOW(), NOW(), '', '', '', ''
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = r.id AND provider = 'email') THEN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), r.id,
        jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
        'email', r.id::text, NOW(), NOW(), NOW()
      );
    END IF;
  END LOOP;
END
$auth$;

-- ========== PROFILES ==========
INSERT INTO public.profiles (id, mock_id, full_name, phone, email, avatar_url, role, city, is_suspended, is_online, member_since)
VALUES
  ('11111111-1111-1111-1111-111111111111','u1','John Chukwuemeka','+234 803 111 2201','john@doovly.test','mock://profile_1.jpg','admin','Lagos',false,true,'2025-01-12'),
  ('22222222-2222-2222-2222-222222222222','u2','Ada Okafor','+2348000000002','ada@doovly.test','mock://profile_2.jpg','user','Lagos',false,false,'2025-01-12'),
  ('33333333-3333-3333-3333-333333333333','u3','Tunde Adebayo','+2348000000003','tunde@doovly.test','mock://profile_3.jpg','user','Lagos',false,false,'2025-01-12'),
  ('44444444-4444-4444-4444-444444444444','u4','Chioma Nwosu','+2348000000004','chioma.nwosu@doovly.test','mock://profile_4.jpg','user','Lagos',false,false,'2025-01-12'),
  ('55555555-5555-5555-5555-555555555555','u5','Blessing K.','+2348000000005','blessing.k@doovly.test',NULL,'user','Lagos',false,false,'2025-01-12'),
  ('66666666-6666-6666-6666-666666666666','u6','Amaka R.','+2348000000006','amaka.r@doovly.test',NULL,'user','Lagos',false,false,'2025-01-12'),
  ('77777777-7777-7777-7777-777777777777','u7','Emeka P.','+2348000000007','emeka.p@doovly.test',NULL,'user','Abuja',false,false,'2025-01-12'),
  ('a1111111-1111-1111-1111-111111111111','u11','Blessing Joy (poster)','+2348000000011','poster@doovly.test',NULL,'user','Lagos',false,false,'2025-01-12'),
  ('b2000000-0000-0000-0000-000000000002','p2','Chioma Eze','+234 802 222 3302','chioma.eze@doovly.test','mock://profile_2.jpg','professional','Lagos',false,true,'2025-01-12'),
  ('b2000000-0000-0000-0000-000000000003','p3','Ikechukwu Obi','+234 805 333 4403','ikechukwu@doovly.test','mock://profile_3.jpg','professional','Abuja',false,false,'2025-01-12'),
  ('b2000000-0000-0000-0000-000000000004','p4','Blessing Joy','+234 806 444 5504','blessing.joy@doovly.test','mock://profile_4.jpg','professional','Lagos',false,true,'2025-01-12'),
  ('b2000000-0000-0000-0000-000000000005','p5','Emeka Okoro','+234 807 555 6605','emeka.okoro@doovly.test','mock://profile_5.jpg','professional','Port Harcourt',false,false,'2025-01-12'),
  ('b2000000-0000-0000-0000-000000000006','p6','Aisha Bello','+234 809 666 7706','aisha@doovly.test','mock://profile_6.jpg','professional','Abuja',false,true,'2025-01-12')
ON CONFLICT (id) DO UPDATE SET
  mock_id = EXCLUDED.mock_id, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
  email = EXCLUDED.email, role = EXCLUDED.role, city = EXCLUDED.city;

-- ========== PROFESSIONALS ==========
INSERT INTO public.professionals (
  id, mock_id, user_id, profession, bio, city, price_from, price_from_value,
  is_verified, is_available, subscribed, latitude, longitude, rating, review_count,
  avatar_url, avatar_key, email, phone
) VALUES
  ('a1000000-0000-0000-0000-000000000001','1','11111111-1111-1111-1111-111111111111','Plumber','Experienced plumber with 8+ years fixing residential and commercial systems across Lagos.','Lagos','₦8,000',8000,true,true,false,6.5244,3.3792,0,3,'mock://profile_1.jpg','profile_1','john.chukwuemeka@email.com','+234 803 111 2201'),
  ('a1000000-0000-0000-0000-000000000002','2','b2000000-0000-0000-0000-000000000002','Nail Tech','Creative nail tech specializing in gel extensions and bridal nail art.','Lagos','₦6,000',6000,true,true,true,6.6018,3.3515,0,2,'mock://profile_2.jpg','profile_2','chioma.eze@email.com','+234 802 222 3302'),
  ('a1000000-0000-0000-0000-000000000003','3','b2000000-0000-0000-0000-000000000003','Mechanic','Mobile mechanic for engine diagnostics, brakes, and same-day repairs.','Abuja','₦10,000',10000,false,true,true,9.0765,7.3986,0,2,'mock://profile_3.jpg','profile_3','ikechukwu.obi@email.com','+234 805 333 4403'),
  ('a1000000-0000-0000-0000-000000000004','4','b2000000-0000-0000-0000-000000000004','Massage Therapist','Certified massage therapist focused on deep tissue and full-body relaxation.','Lagos','₦18,000',18000,true,true,true,6.4281,3.4219,0,2,'mock://profile_4.jpg','profile_4','blessing.joy@email.com','+234 806 444 5504'),
  ('a1000000-0000-0000-0000-000000000005','5','b2000000-0000-0000-0000-000000000005','Electrician','Licensed electrician for home wiring, fault finding, and lighting installs.','Port Harcourt','₦7,500',7500,false,true,true,4.8156,7.0498,0,2,'mock://profile_5.jpg','profile_5','emeka.okoro@email.com','+234 807 555 6605'),
  ('a1000000-0000-0000-0000-000000000006','6','b2000000-0000-0000-0000-000000000006','Barber','Sharp fades and beard trims with a clean, professional finish every time.','Abuja','₦4,000',4000,true,true,true,9.0579,7.4951,0,2,'mock://profile_6.jpg','profile_6','aisha.bello@email.com','+234 809 666 7706')
ON CONFLICT (id) DO UPDATE SET
  mock_id = EXCLUDED.mock_id, user_id = EXCLUDED.user_id, profession = EXCLUDED.profession,
  bio = EXCLUDED.bio, is_verified = EXCLUDED.is_verified, subscribed = EXCLUDED.subscribed,
  review_count = EXCLUDED.review_count, email = EXCLUDED.email, phone = EXCLUDED.phone;

-- ========== SERVICES ==========
DELETE FROM public.services WHERE professional_id IN ('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000006');
INSERT INTO public.services (professional_id, mock_id, name, description, price, price_value, icon) VALUES
  ('a1000000-0000-0000-0000-000000000001','s1','Plumbing Installation','Professional installation of pipes, taps, fixtures and fittings.','₦8,000',8000,'pipe'),
  ('a1000000-0000-0000-0000-000000000001','s2','Drain Cleaning','Professional drain cleaning and blockage removal.','₦10,000',10000,'pipe-leak'),
  ('a1000000-0000-0000-0000-000000000001','s3','Water Heater Repair','Repair and maintenance of electric and gas water heaters.','₦12,000',12000,'water-boiler'),
  ('a1000000-0000-0000-0000-000000000002','s1','Nail Extension','Acrylic and gel nail extensions with custom designs.','₦6,000',6000,'nail'),
  ('a1000000-0000-0000-0000-000000000002','s2','Manicure & Pedicure','Complete manicure and pedicure treatment.','₦8,000',8000,'hand-okay'),
  ('a1000000-0000-0000-0000-000000000002','s3','Nail Art','Creative nail art and detailed custom designs.','₦4,000',4000,'brush'),
  ('a1000000-0000-0000-0000-000000000003','s1','Engine Diagnostics','Complete engine inspection and fault diagnosis.','₦10,000',10000,'car-wrench'),
  ('a1000000-0000-0000-0000-000000000003','s2','Oil Change','Engine oil and filter replacement service.','₦15,000',15000,'oil'),
  ('a1000000-0000-0000-0000-000000000003','s3','Brake Repair','Brake inspection, repair and replacement.','₦12,000',12000,'car-brake-alert'),
  ('a1000000-0000-0000-0000-000000000004','s1','Full Body Massage','Relaxing full body massage session lasting 60–90 minutes.','₦18,000',18000,'spa'),
  ('a1000000-0000-0000-0000-000000000004','s2','Deep Tissue Massage','Focused massage designed for muscle tension and relaxation.','₦22,000',22000,'hand-back-right'),
  ('a1000000-0000-0000-0000-000000000005','s1','Wiring & Installation','Home and office electrical wiring and installations.','₦7,500',7500,'flash'),
  ('a1000000-0000-0000-0000-000000000005','s2','Fault Finding','Diagnose and repair electrical faults safely.','₦9,000',9000,'lightning-bolt'),
  ('a1000000-0000-0000-0000-000000000005','s3','Lighting Installation','Indoor and outdoor lighting installation.','₦6,000',6000,'lightbulb'),
  ('a1000000-0000-0000-0000-000000000006','s1','Haircut','Classic and modern haircuts for men.','₦4,000',4000,'content-cut'),
  ('a1000000-0000-0000-0000-000000000006','s2','Beard Trim','Professional beard shaping and trimming.','₦2,500',2500,'mustache'),
  ('a1000000-0000-0000-0000-000000000006','s3','Haircut & Beard','Complete haircut and beard grooming package.','₦6,000',6000,'face-man');

-- ========== PORTFOLIO ==========
DELETE FROM public.portfolio_items WHERE professional_id IN ('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000006');
INSERT INTO public.portfolio_items (professional_id, mock_id, description, image_key, image_url, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001','p1','Installed new kitchen pipes, taps and drainage connections.','profile_1','mock://profile_1.jpg',0),
  ('a1000000-0000-0000-0000-000000000001','p2','Completed a full bathroom plumbing installation.','profile_1','mock://profile_1.jpg',1),
  ('a1000000-0000-0000-0000-000000000001','p3','Installed and tested a residential water heating system.','profile_1','mock://profile_1.jpg',2),
  ('a1000000-0000-0000-0000-000000000001','p4','Removed blockage and restored proper drainage flow.','profile_1','mock://profile_1.jpg',3),
  ('a1000000-0000-0000-0000-000000000002','p1','Elegant gel nails with a clean modern finish.','profile_2','mock://profile_2.jpg',0),
  ('a1000000-0000-0000-0000-000000000002','p2','Classic French tip design with a polished finish.','profile_2','mock://profile_2.jpg',1),
  ('a1000000-0000-0000-0000-000000000002','p3','Custom bridal nail design with detailed decoration.','profile_2','mock://profile_2.jpg',2),
  ('a1000000-0000-0000-0000-000000000002','p4','Premium nail art with custom patterns and finishing.','profile_2','mock://profile_2.jpg',3),
  ('a1000000-0000-0000-0000-000000000003','p1','Diagnosed and repaired a vehicle engine fault.','profile_3','mock://profile_3.jpg',0),
  ('a1000000-0000-0000-0000-000000000003','p2','Completed brake inspection and replacement.','profile_3','mock://profile_3.jpg',1),
  ('a1000000-0000-0000-0000-000000000003','p3','Performed full oil and filter replacement.','profile_3','mock://profile_3.jpg',2),
  ('a1000000-0000-0000-0000-000000000003','p4','Identified and resolved multiple dashboard fault codes.','profile_3','mock://profile_3.jpg',3),
  ('a1000000-0000-0000-0000-000000000004','p1','Completed a relaxing full body massage session.','profile_4','mock://profile_4.jpg',0),
  ('a1000000-0000-0000-0000-000000000004','p2','Provided targeted deep tissue massage treatment.','profile_4','mock://profile_4.jpg',1),
  ('a1000000-0000-0000-0000-000000000004','p3','Created a calming wellness session for a returning client.','profile_4','mock://profile_4.jpg',2),
  ('a1000000-0000-0000-0000-000000000004','p4','Delivered a personalized relaxation and wellness treatment.','profile_4','mock://profile_4.jpg',3),
  ('a1000000-0000-0000-0000-000000000005','p1','Completed electrical wiring for a residential property.','profile_5','mock://profile_5.jpg',0),
  ('a1000000-0000-0000-0000-000000000005','p2','Installed modern lighting throughout a home.','profile_5','mock://profile_5.jpg',1),
  ('a1000000-0000-0000-0000-000000000005','p3','Diagnosed and repaired multiple electrical faults.','profile_5','mock://profile_5.jpg',2),
  ('a1000000-0000-0000-0000-000000000005','p4','Completed electrical installation for a small office.','profile_5','mock://profile_5.jpg',3),
  ('a1000000-0000-0000-0000-000000000006','p1','Clean classic fade with a sharp professional finish.','profile_6','mock://profile_6.jpg',0),
  ('a1000000-0000-0000-0000-000000000006','p2','Detailed beard shaping and grooming service.','profile_6','mock://profile_6.jpg',1),
  ('a1000000-0000-0000-0000-000000000006','p3','Modern low fade with a clean line-up.','profile_6','mock://profile_6.jpg',2),
  ('a1000000-0000-0000-0000-000000000006','p4','Complete haircut, beard trim and styling.','profile_6','mock://profile_6.jpg',3);

-- ========== REVIEWS ==========
DELETE FROM public.reviews WHERE professional_id IN ('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000006');
INSERT INTO public.reviews (professional_id, user_id, mock_id, user_name, comment, display_date, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','r1','Ada O.','Very professional and on time. Fixed my kitchen sink perfectly.','May 10, 2025','2025-05-10'),
  ('a1000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','r2','Tunde A.','Honest pricing and clean work. Highly recommended.','Apr 28, 2025','2025-04-28'),
  ('a1000000-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','r3','Chioma N.','Good job overall. The quality of the work was excellent.','Apr 12, 2025','2025-04-12'),
  ('a1000000-0000-0000-0000-000000000002','55555555-5555-5555-5555-555555555555','r1','Blessing K.','Beautiful nails and very careful. Will book again.','May 5, 2025','2025-05-05'),
  ('a1000000-0000-0000-0000-000000000002','66666666-6666-6666-6666-666666666666','r2','Amaka R.','Very neat work and friendly service.','Apr 21, 2025','2025-04-21'),
  ('a1000000-0000-0000-0000-000000000003','77777777-7777-7777-7777-777777777777','r1','Emeka P.','Fixed my car the same day. Fair price.','May 1, 2025','2025-05-01'),
  ('a1000000-0000-0000-0000-000000000003',NULL,'r2','David O.','Explained the problem clearly and completed the repair.','Apr 18, 2025','2025-04-18'),
  ('a1000000-0000-0000-0000-000000000004',NULL,'r1','Ngozi M.','Very relaxing. Professional and respectful.','Apr 20, 2025','2025-04-20'),
  ('a1000000-0000-0000-0000-000000000004',NULL,'r2','Sarah A.','Great experience and very comfortable environment.','Apr 10, 2025','2025-04-10'),
  ('a1000000-0000-0000-0000-000000000005',NULL,'r1','Ifeanyi D.','Quick and safe. Explained everything clearly.','May 8, 2025','2025-05-08'),
  ('a1000000-0000-0000-0000-000000000005',NULL,'r2','Chinedu K.','Very neat electrical work and fair pricing.','Apr 25, 2025','2025-04-25'),
  ('a1000000-0000-0000-0000-000000000006',NULL,'r1','Yusuf H.','Clean cut every time. Very professional.','May 3, 2025','2025-05-03'),
  ('a1000000-0000-0000-0000-000000000006',NULL,'r2','Ibrahim S.','Great attention to detail and excellent service.','Apr 16, 2025','2025-04-16');

-- ========== BOOKINGS ==========
DELETE FROM public.bookings WHERE mock_id IS NOT NULL;
INSERT INTO public.bookings (
  id, mock_id, customer_id, professional_id, title, service_name,
  professional_name, customer_name, professional_verified, status,
  amount, location, display_date, scheduled_at, rating, reviews_count
) VALUES
  ('b1000000-0000-0000-0000-000000000001','b1','11111111-1111-1111-1111-111111111111','a1000000-0000-0000-0000-000000000002','Nail Extension','Nail Extension','Chioma Eze','You',true,'pending',15400,'Lagos','May 25, 2025 10:00 AM','2025-05-25 10:00:00+01',4.9,89),
  ('b1000000-0000-0000-0000-000000000002','b2','11111111-1111-1111-1111-111111111111','a1000000-0000-0000-0000-000000000004','Full Body Massage','Full Body Massage','Blessing Joy','You',true,'accepted',18000,'Lagos','May 22, 2025 02:30 PM','2025-05-22 14:30:00+01',4.9,32),
  ('b1000000-0000-0000-0000-000000000003','b3','11111111-1111-1111-1111-111111111111','a1000000-0000-0000-0000-000000000003','Car Repair','Car Repair','Ikechukwu Obi','You',false,'declined',28000,'Abuja','May 18, 2025 11:00 AM','2025-05-18 11:00:00+01',4.7,64),
  ('b1000000-0000-0000-0000-000000000011','r1','22222222-2222-2222-2222-222222222222','a1000000-0000-0000-0000-000000000001','House Cleaning','House Cleaning','John Chukwuemeka','Ada Okafor',true,'pending',15400,'Lagos','May 28, 2025 09:00 AM','2025-05-28 09:00:00+01',5.0,12),
  ('b1000000-0000-0000-0000-000000000012','r2','33333333-3333-3333-3333-333333333333','a1000000-0000-0000-0000-000000000001','AC Repair','AC Repair','John Chukwuemeka','Tunde Adebayo',true,'accepted',22000,'Lagos','May 27, 2025 02:30 PM','2025-05-27 14:30:00+01',4.8,20),
  ('b1000000-0000-0000-0000-000000000013','r3','44444444-4444-4444-4444-444444444444','a1000000-0000-0000-0000-000000000001','Furniture Assembly','Furniture Assembly','John Chukwuemeka','Chioma Nwosu',true,'declined',12000,'Abuja','May 24, 2025 11:00 AM','2025-05-24 11:00:00+01',4.9,8);

-- ========== SERVICE REQUESTS ==========
DELETE FROM public.service_request_comments; DELETE FROM public.service_request_offers;
DELETE FROM public.service_request_likes; DELETE FROM public.service_requests WHERE mock_id IS NOT NULL;
INSERT INTO public.service_requests (
  id, mock_id, title, category, profession, location, city, price, description,
  icon, icon_background, time_ago, is_new, created_by, poster_name, poster_verified, max_offers, offers_count
) VALUES
  ('c1000000-0000-0000-0000-000000000001','1','Leaking pipe in bathroom','Plumbing','Plumber','Victoria Island','Lagos',NULL,'Bathroom pipe is leaking under the sink. Need someone experienced who can fix it today if possible.','pipe','#E8F5E9','2 min ago',true,'66666666-6666-6666-6666-666666666666','Amaka O.',true,3,1),
  ('c1000000-0000-0000-0000-000000000002','2','Need electrician to fix power','Electrical','Electrician','Lekki Phase 1','Lagos',NULL,'Power keeps tripping in the living room. Looking for a licensed electrician to diagnose and fix.','flash','#E3F2FD','5 min ago',true,'b2000000-0000-0000-0000-000000000005','Emeka Okoro',false,5,0),
  ('c1000000-0000-0000-0000-000000000003','3','Car needs urgent repair','Mechanic','Mechanic','Ikoyi','Lagos',NULL,'Engine warning light is on and the car is making a strange noise. Need a reliable mechanic ASAP.','car-wrench','#FFF3E0','8 min ago',true,'b2000000-0000-0000-0000-000000000003','Ikechukwu Obi',false,5,0),
  ('c1000000-0000-0000-0000-000000000004','4','Haircut and beard trim','Barber','Barber','Garki','Abuja',NULL,'Looking for a clean haircut and beard trim. Prefer someone who can come to my location.','content-cut','#F3E5F5','12 min ago',true,'b2000000-0000-0000-0000-000000000006','Aisha Bello',true,5,0),
  ('c1000000-0000-0000-0000-000000000005','5','Gel nails and manicure','Nail Tech','Nail Tech','Surulere','Lagos',NULL,'Need gel nails and a full manicure. Looking for a neat and experienced nail tech.','nail','#FCE4EC','20 min ago',true,'b2000000-0000-0000-0000-000000000002','Chioma Eze',true,5,0),
  ('c1000000-0000-0000-0000-000000000006','6','House wiring check','Electrical','Electrician','GRA','Port Harcourt',NULL,'Need a full house wiring safety check. Some outlets are warm and lights flicker.','lightning-bolt','#E3F2FD','25 min ago',true,'b2000000-0000-0000-0000-000000000005','Emeka Okoro',false,5,0),
  ('c1000000-0000-0000-0000-000000000007','7','Blocked kitchen sink','Plumbing','Plumber','Wuse 2','Abuja',NULL,'Kitchen sink is fully blocked. Need a plumber who can clear it and check the pipes.','pipe-leak','#E8F5E9','30 min ago',true,'11111111-1111-1111-1111-111111111111','John Chukwuemeka',true,5,0),
  ('c1000000-0000-0000-0000-000000000011','11','Home Cleaning Needed','Cleaning','Cleaner','Lekki Phase 1','Lagos','₦15,000','Looking for a reliable cleaner for a 3-bedroom apartment. Deep clean preferred.','broom','#E0F2F1','1 hr ago',true,'a1111111-1111-1111-1111-111111111111','Blessing Joy (poster)',false,5,0);

-- ========== NOTIFICATIONS ==========
DELETE FROM public.notifications WHERE mock_id IS NOT NULL;
INSERT INTO public.notifications (mock_id, user_id, type, title, body, unread, time_label) VALUES
  ('n1','11111111-1111-1111-1111-111111111111','booking','Booking Confirmed','Your booking with Tunde Electrician has been confirmed.',true,'2 min ago'),
  ('n2','11111111-1111-1111-1111-111111111111','upcoming','Upcoming Booking','You have a booking with Bright Cleaning scheduled for tomorrow at 10:00 AM.',true,'25 min ago'),
  ('n3','11111111-1111-1111-1111-111111111111','message','New Message','You have a new message from Sarah Makeover.',true,'1 hr ago'),
  ('n4','11111111-1111-1111-1111-111111111111','payment','Payment Successful','Your payment of ₦15,000 was successful.',true,'3 hrs ago'),
  ('n5','11111111-1111-1111-1111-111111111111','verification','Verification Update','Your identity verification is under review.',true,'1 day ago'),
  ('n6','11111111-1111-1111-1111-111111111111','review','Review Received','You received a 5-star review from John Doe.',true,'2 days ago'),
  ('n7','11111111-1111-1111-1111-111111111111','general','Welcome to Doovly','Thanks for joining. Explore services near you.',false,'3 days ago'),
  ('n8','22222222-2222-2222-2222-222222222222','booking','Booking Confirmed','Your booking with Chioma Plumber has been confirmed.',true,'1 hr ago'),
  ('n9','22222222-2222-2222-2222-222222222222','general','Tip','Complete your profile to get more bookings.',true,'2 days ago');

-- ========== ADMIN NOTIFICATIONS ==========
DELETE FROM public.admin_notifications WHERE mock_id IS NOT NULL;
INSERT INTO public.admin_notifications (mock_id, title, message, channels, sent_to, sent_to_label, status, created_by) VALUES
  ('n1','New Feature Available','Check out our latest features and improvements on the platform.','{in-app,email}','all','All Users','sent','11111111-1111-1111-1111-111111111111'),
  ('n2','Service Request Alert','There are new service requests waiting for professionals.','{in-app}','verified','Verified Users','sent','11111111-1111-1111-1111-111111111111'),
  ('n3','Subscription Offer','Upgrade to Pro and get exclusive benefits this month.','{in-app,email,sms}','free','Free Users','sent','11111111-1111-1111-1111-111111111111'),
  ('n4','Account Verification','Your verification documents have been received and are under review.','{in-app,email}','all','All Users','sent','11111111-1111-1111-1111-111111111111'),
  ('n5','Payment Confirmation','Your payment of ₦2,500 has been successfully processed.','{in-app,email}','subscribed','Subscribed Users','sent','11111111-1111-1111-1111-111111111111'),
  ('n6','System Maintenance','Our platform will be down for scheduled maintenance on Oct 5.','{in-app,email,sms}','all','All Users','scheduled','11111111-1111-1111-1111-111111111111');

-- ========== SAVED PROVIDERS ==========
INSERT INTO public.saved_providers (user_id, professional_id) VALUES
  ('11111111-1111-1111-1111-111111111111','a1000000-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111','a1000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ========== CITIES ==========
DELETE FROM public.cities;
INSERT INTO public.cities (name, sort_order) VALUES
  ('Lagos',0),('Abuja',1),('Port Harcourt',2),('Ibadan',3),('Kano',4),
  ('Benin City',5),('Enugu',6),('Abeokuta',7),('Ilorin',8),('Jos',9),
  ('Kaduna',10),('Warri',11),('Calabar',12),('Uyo',13),('Owerri',14),
  ('Akure',15),('Aba',16),('Onitsha',17),('Maiduguri',18),('Sokoto',19);

-- ========== CATEGORIES ==========
DELETE FROM public.service_categories;
INSERT INTO public.service_categories (mock_id, name, icon, sort_order) VALUES
  ('plumbing','Plumbing','pipe',0),('electrical','Electrical','flash',1),
  ('cleaning','Cleaning','broom',2),('mechanic','Mechanic','car-wrench',3),
  ('barber','Barber','content-cut',4),('nail-tech','Nail Tech','nail',5),
  ('massage','Massage','spa',6),('carpentry','Carpentry','hammer',7);

-- ========== PLANS ==========
DELETE FROM public.subscription_plan_features;
DELETE FROM public.subscription_plans;
DELETE FROM public.subscription_plan_meta;
INSERT INTO public.subscription_plans (id, mock_id, name, tagline, monthly_price, yearly_price, popular, sort_order) VALUES
  ('e1000000-0000-0000-0000-000000000001','basic','Basic','Get started for free',0,0,false,0),
  ('e1000000-0000-0000-0000-000000000002','pro','Pro','Unlock more opportunities',2500,25000,true,1);
INSERT INTO public.subscription_plan_features (mock_id, plan_id, label, sort_order) VALUES
  ('b1','e1000000-0000-0000-0000-000000000001','Basic profile',0),
  ('b2','e1000000-0000-0000-0000-000000000001','Browse service requests',1),
  ('b3','e1000000-0000-0000-0000-000000000001','Limited applications (5 per month)',2),
  ('b4','e1000000-0000-0000-0000-000000000001','Basic job filters',3),
  ('b5','e1000000-0000-0000-0000-000000000001','Community support',4),
  ('p1','e1000000-0000-0000-0000-000000000002','Verified / featured profile',0),
  ('p2','e1000000-0000-0000-0000-000000000002','Unlimited applications',1),
  ('p3','e1000000-0000-0000-0000-000000000002','Advanced job filters',2),
  ('p4','e1000000-0000-0000-0000-000000000002','Priority nearby job alerts',3),
  ('p5','e1000000-0000-0000-0000-000000000002','Earnings & performance dashboard',4),
  ('p6','e1000000-0000-0000-0000-000000000002','Portfolio boost',5),
  ('p7','e1000000-0000-0000-0000-000000000002','Dedicated support',6);
INSERT INTO public.subscription_plan_meta (promo_title, promo_subtitle, yearly_save_percent) VALUES
  ('Unlock more opportunities','Upgrade to get advanced tools, more visibility and grow your business faster.',17);

-- ========== PRO SUBSCRIPTIONS ==========
DELETE FROM public.professional_subscriptions WHERE mock_id IS NOT NULL;
INSERT INTO public.professional_subscriptions (mock_id, professional_id, user_id, plan_id, plan_code, status, status_label, start_date, end_date) VALUES
  ('sub-1','a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','e1000000-0000-0000-0000-000000000001','free','active','Active','2025-01-01',NULL),
  ('sub-2','a1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002','pro','active','Active','2025-01-01','2026-01-01'),
  ('sub-3','a1000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000002','pro','active','Active','2025-01-01','2026-01-01'),
  ('sub-4','a1000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000002','pro','active','Active','2025-01-01','2026-01-01'),
  ('sub-5','a1000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000002','pro','active','Active','2025-01-01','2026-01-01'),
  ('sub-6','a1000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000006','e1000000-0000-0000-0000-000000000002','pro','active','Active','2025-01-01','2026-01-01');

-- ========== VERIFICATION ==========
DELETE FROM public.verification_documents;
DELETE FROM public.verification_applications;
INSERT INTO public.verification_applications (id, mock_id, professional_id, user_id, status, submitted_on, email, phone) VALUES
  ('f1000000-0000-0000-0000-000000000001','va-1','a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','verified','2025-01-12','john.chukwuemeka@email.com','+234 803 111 2201'),
  ('f1000000-0000-0000-0000-000000000002','va-2','a1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','verified','2025-01-09','chioma.eze@email.com','+234 802 222 3302'),
  ('f1000000-0000-0000-0000-000000000003','va-3','a1000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000003','pending','2025-01-06','ikechukwu.obi@email.com','+234 805 333 4403'),
  ('f1000000-0000-0000-0000-000000000004','va-4','a1000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000004','verified','2025-01-03','blessing.joy@email.com','+234 806 444 5504'),
  ('f1000000-0000-0000-0000-000000000005','va-5','a1000000-0000-0000-0000-000000000005','b2000000-0000-0000-0000-000000000005','pending','2024-12-31','emeka.okoro@email.com','+234 807 555 6605'),
  ('f1000000-0000-0000-0000-000000000006','va-6','a1000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000006','verified','2024-12-28','aisha.bello@email.com','+234 809 666 7706');

INSERT INTO public.verification_documents (mock_id, application_id, title, file_name, doc_type, uploaded, preview_key, file_url)
SELECT v.mock_id, v.app_id, v.title, v.fname, v.dtype, true, v.pkey, v.purl
FROM (VALUES
  ('va-1-gov','f1000000-0000-0000-0000-000000000001'::uuid,'Government ID','government_id.pdf','pdf','profile_1','mock://profile_1.jpg'),
  ('va-1-lic','f1000000-0000-0000-0000-000000000001'::uuid,'Professional License','professional_license.pdf','pdf','profile_1','mock://profile_1.jpg'),
  ('va-1-cert','f1000000-0000-0000-0000-000000000001'::uuid,'Professional Certificate','certificate.pdf','pdf','profile_1','mock://profile_1.jpg'),
  ('va-1-photo','f1000000-0000-0000-0000-000000000001'::uuid,'Profile Photo','profile_photo.jpg','image','profile_1','mock://profile_1.jpg'),
  ('va-2-gov','f1000000-0000-0000-0000-000000000002'::uuid,'Government ID','government_id.pdf','pdf','profile_2','mock://profile_2.jpg'),
  ('va-2-lic','f1000000-0000-0000-0000-000000000002'::uuid,'Professional License','professional_license.pdf','pdf','profile_2','mock://profile_2.jpg'),
  ('va-2-cert','f1000000-0000-0000-0000-000000000002'::uuid,'Professional Certificate','certificate.pdf','pdf','profile_2','mock://profile_2.jpg'),
  ('va-2-photo','f1000000-0000-0000-0000-000000000002'::uuid,'Profile Photo','profile_photo.jpg','image','profile_2','mock://profile_2.jpg'),
  ('va-3-gov','f1000000-0000-0000-0000-000000000003'::uuid,'Government ID','government_id.pdf','pdf','profile_3','mock://profile_3.jpg'),
  ('va-3-lic','f1000000-0000-0000-0000-000000000003'::uuid,'Professional License','professional_license.pdf','pdf','profile_3','mock://profile_3.jpg'),
  ('va-3-cert','f1000000-0000-0000-0000-000000000003'::uuid,'Professional Certificate','certificate.pdf','pdf','profile_3','mock://profile_3.jpg'),
  ('va-3-photo','f1000000-0000-0000-0000-000000000003'::uuid,'Profile Photo','profile_photo.jpg','image','profile_3','mock://profile_3.jpg'),
  ('va-4-gov','f1000000-0000-0000-0000-000000000004'::uuid,'Government ID','government_id.pdf','pdf','profile_4','mock://profile_4.jpg'),
  ('va-4-lic','f1000000-0000-0000-0000-000000000004'::uuid,'Professional License','professional_license.pdf','pdf','profile_4','mock://profile_4.jpg'),
  ('va-4-cert','f1000000-0000-0000-0000-000000000004'::uuid,'Professional Certificate','certificate.pdf','pdf','profile_4','mock://profile_4.jpg'),
  ('va-4-photo','f1000000-0000-0000-0000-000000000004'::uuid,'Profile Photo','profile_photo.jpg','image','profile_4','mock://profile_4.jpg'),
  ('va-5-gov','f1000000-0000-0000-0000-000000000005'::uuid,'Government ID','government_id.pdf','pdf','profile_5','mock://profile_5.jpg'),
  ('va-5-lic','f1000000-0000-0000-0000-000000000005'::uuid,'Professional License','professional_license.pdf','pdf','profile_5','mock://profile_5.jpg'),
  ('va-5-cert','f1000000-0000-0000-0000-000000000005'::uuid,'Professional Certificate','certificate.pdf','pdf','profile_5','mock://profile_5.jpg'),
  ('va-5-photo','f1000000-0000-0000-0000-000000000005'::uuid,'Profile Photo','profile_photo.jpg','image','profile_5','mock://profile_5.jpg'),
  ('va-6-gov','f1000000-0000-0000-0000-000000000006'::uuid,'Government ID','government_id.pdf','pdf','profile_6','mock://profile_6.jpg'),
  ('va-6-lic','f1000000-0000-0000-0000-000000000006'::uuid,'Professional License','professional_license.pdf','pdf','profile_6','mock://profile_6.jpg'),
  ('va-6-cert','f1000000-0000-0000-0000-000000000006'::uuid,'Professional Certificate','certificate.pdf','pdf','profile_6','mock://profile_6.jpg'),
  ('va-6-photo','f1000000-0000-0000-0000-000000000006'::uuid,'Profile Photo','profile_photo.jpg','image','profile_6','mock://profile_6.jpg')
) AS v(mock_id, app_id, title, fname, dtype, pkey, purl);

-- ========== CHAT ==========
DELETE FROM public.messages; DELETE FROM public.conversation_reads; DELETE FROM public.conversations;
INSERT INTO public.conversations (id, mock_id, participant_a, participant_b, booking_id, last_message, last_message_at) VALUES
  ('d1000000-0000-0000-0000-000000000001','c1','11111111-1111-1111-1111-111111111111','b2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','Hi! Is this still available?', NOW() - INTERVAL '1 hour'),
  ('d1000000-0000-0000-0000-000000000002','c2','11111111-1111-1111-1111-111111111111','b2000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000002','The place is ready for you.', NOW() - INTERVAL '2 hours'),
  ('d1000000-0000-0000-0000-000000000003','c3','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000011','Can you come tomorrow?', NOW() - INTERVAL '3 hours'),
  ('d1000000-0000-0000-0000-000000000004','c4','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000012','Thanks, see you then.', NOW() - INTERVAL '4 hours');
INSERT INTO public.conversation_reads (conversation_id, user_id, unread_count) VALUES
  ('d1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',0),
  ('d1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002',1),
  ('d1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',0),
  ('d1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000004',1),
  ('d1000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222',0),
  ('d1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',1),
  ('d1000000-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',0),
  ('d1000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',1);
INSERT INTO public.messages (mock_id, conversation_id, sender_id, text, kind) VALUES
  ('m1','d1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Hi! Is this still available?','text'),
  ('m1','d1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000004','The place is ready for you.','text'),
  ('m1','d1000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','Can you come tomorrow?','text'),
  ('m1','d1000000-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','Thanks, see you then.','text');

