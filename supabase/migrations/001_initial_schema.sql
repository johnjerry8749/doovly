-- ============================================================
-- Doovly – Initial Schema (core tables)
-- Full mock parity = 001 + 002_mock_parity.sql + seed.sql
-- App mappers: src/lib/ids.ts, src/lib/mappers.ts
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES (1:1 with auth.users)
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'professional')),
  city          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PROFESSIONALS
-- ------------------------------------------------------------
CREATE TABLE public.professionals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession      TEXT NOT NULL,
  bio             TEXT,
  city            TEXT NOT NULL,
  price_from      TEXT NOT NULL,          -- e.g. "₦8,000"
  price_from_value NUMERIC(12,2),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed      BOOLEAN NOT NULL DEFAULT FALSE,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  rating          NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER NOT NULL DEFAULT 0,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_professionals_city ON public.professionals (city);
CREATE INDEX idx_professionals_available ON public.professionals (is_available);
CREATE INDEX idx_professionals_user ON public.professionals (user_id);

-- ------------------------------------------------------------
-- SERVICES (nested under professional – matches ProService)
-- ------------------------------------------------------------
CREATE TABLE public.services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  price           TEXT NOT NULL,           -- e.g. "₦8,000"
  price_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  icon            TEXT NOT NULL DEFAULT 'briefcase-outline',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_professional ON public.services (professional_id);

-- ------------------------------------------------------------
-- REVIEWS (matches ProReview)
-- ------------------------------------------------------------
CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name       TEXT NOT NULL,
  comment         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_professional ON public.reviews (professional_id);

-- ------------------------------------------------------------
-- BOOKINGS (matches Booking type + useMyBookings / useCreateBooking)
-- ------------------------------------------------------------
CREATE TABLE public.bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,          -- service name / title
  service_name      TEXT,                   -- alias used by some hooks
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  amount            NUMERIC(12,2),
  location          TEXT,
  address           TEXT,
  notes             TEXT,
  scheduled_at      TIMESTAMPTZ,
  rating            NUMERIC(3,2),
  reviews_count     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer ON public.bookings (customer_id);
CREATE INDEX idx_bookings_professional ON public.bookings (professional_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);

-- ------------------------------------------------------------
-- SERVICE REQUESTS (matches ServiceRequest)
-- ------------------------------------------------------------
CREATE TABLE public.service_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  profession        TEXT NOT NULL,
  location          TEXT NOT NULL,
  city              TEXT NOT NULL,
  price             TEXT,
  description       TEXT NOT NULL DEFAULT '',
  icon              TEXT NOT NULL DEFAULT 'briefcase-outline',
  icon_background   TEXT DEFAULT '#E8F5E9',
  images            TEXT[] DEFAULT '{}',    -- remote URLs later; empty for now
  is_new            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  poster_name       TEXT NOT NULL,
  poster_avatar_url TEXT,
  poster_verified   BOOLEAN DEFAULT FALSE,
  likes_count       INTEGER NOT NULL DEFAULT 0,
  max_offers        INTEGER NOT NULL DEFAULT 5,
  offers_count      INTEGER NOT NULL DEFAULT 0,
  offered_by        UUID[] DEFAULT '{}',
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_requests_city ON public.service_requests (city);
CREATE INDEX idx_service_requests_created_by ON public.service_requests (created_by);

-- ------------------------------------------------------------
-- SERVICE REQUEST COMMENTS
-- ------------------------------------------------------------
CREATE TABLE public.service_request_comments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name       TEXT NOT NULL,
  user_avatar_url TEXT,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_comments_request ON public.service_request_comments (request_id);

-- ------------------------------------------------------------
-- NOTIFICATIONS (matches Notification type)
-- ------------------------------------------------------------
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'booking', 'upcoming', 'message', 'payment',
                'verification', 'review', 'general'
              )),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  unread      BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id, unread);

-- ------------------------------------------------------------
-- SAVED PROVIDERS (heart / favourites)
-- ------------------------------------------------------------
CREATE TABLE public.saved_providers (
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, professional_id)
);

-- ------------------------------------------------------------
-- UPDATED_AT helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- BASIC RLS (enable + permissive for authenticated – tighten later)
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;

-- Public read for professionals, services, reviews, service_requests
CREATE POLICY "Public can view professionals"
  ON public.professionals FOR SELECT USING (true);

CREATE POLICY "Public can view services"
  ON public.services FOR SELECT USING (true);

CREATE POLICY "Public can view reviews"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Public can view service requests"
  ON public.service_requests FOR SELECT USING (true);

CREATE POLICY "Public can view request comments"
  ON public.service_request_comments FOR SELECT USING (true);

-- Profiles: users can read all, update own
CREATE POLICY "Public can view profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Bookings: own only
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.uid() IN (
      SELECT user_id FROM public.professionals WHERE id = professional_id
    )
  );

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Notifications: own only
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Saved providers: own only
CREATE POLICY "Users can manage own saved providers"
  ON public.saved_providers FOR ALL USING (auth.uid() = user_id);

-- Authenticated can insert reviews / comments / requests
CREATE POLICY "Authenticated can insert reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert comments"
  ON public.service_request_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert service requests"
  ON public.service_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
