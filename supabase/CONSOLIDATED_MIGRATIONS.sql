-- Doovly consolidated migration archive
-- Concatenated from supabase/migrations on master.
-- ARCHIVE ONLY, NOT SAFE TO RUN AS ONE MIGRATION against production.
-- Existing migration files and live database migration history remain authoritative.


-- =====================================================================
-- SOURCE FILE: supabase/migrations/001_schema.sql
-- =====================================================================

-- ============================================================
-- Doovly schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_id           TEXT,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  avatar_url        TEXT,
  role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'professional')),
  city              TEXT,
  is_suspended      BOOLEAN NOT NULL DEFAULT FALSE,
  is_online         BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at    TIMESTAMPTZ,
  last_active_label TEXT,
  member_since      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX profiles_mock_id_key ON public.profiles (mock_id) WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- PROFESSIONALS
-- ------------------------------------------------------------
CREATE TABLE public.professionals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id          TEXT,
  user_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession       TEXT NOT NULL,
  bio              TEXT,
  city             TEXT NOT NULL,
  price_from       TEXT NOT NULL,
  price_from_value NUMERIC(12,2),
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed       BOOLEAN NOT NULL DEFAULT FALSE,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  rating           NUMERIC(3,2) DEFAULT 0,
  review_count     INTEGER NOT NULL DEFAULT 0,
  avatar_url       TEXT,
  avatar_key       TEXT,
  email            TEXT,
  phone            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX professionals_mock_id_key ON public.professionals (mock_id) WHERE mock_id IS NOT NULL;
CREATE INDEX idx_professionals_city ON public.professionals (city);
CREATE INDEX idx_professionals_available ON public.professionals (is_available);

-- ------------------------------------------------------------
-- SERVICES
-- ------------------------------------------------------------
CREATE TABLE public.services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  mock_id         TEXT,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  price           TEXT NOT NULL,
  price_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  icon            TEXT NOT NULL DEFAULT 'briefcase-outline',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_professional ON public.services (professional_id);
CREATE UNIQUE INDEX idx_services_mock
  ON public.services (professional_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- PORTFOLIO
-- ------------------------------------------------------------
CREATE TABLE public.portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  mock_id         TEXT,
  description     TEXT NOT NULL DEFAULT '',
  image_key       TEXT,
  image_url       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_professional ON public.portfolio_items (professional_id);
CREATE UNIQUE INDEX idx_portfolio_mock
  ON public.portfolio_items (professional_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mock_id         TEXT,
  user_name       TEXT NOT NULL,
  comment         TEXT NOT NULL,
  display_date    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_professional ON public.reviews (professional_id);
CREATE UNIQUE INDEX idx_reviews_mock
  ON public.reviews (professional_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------------------
CREATE TABLE public.bookings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id                TEXT,
  customer_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id        UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  service_name           TEXT,
  professional_name      TEXT,
  customer_name          TEXT,
  professional_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  status                 TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  amount                 NUMERIC(12,2),
  location               TEXT,
  address                TEXT,
  notes                  TEXT,
  display_date           TEXT,
  scheduled_at           TIMESTAMPTZ,
  rating                 NUMERIC(3,2),
  reviews_count          INTEGER DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX bookings_mock_id_key ON public.bookings (mock_id) WHERE mock_id IS NOT NULL;
CREATE INDEX idx_bookings_customer ON public.bookings (customer_id);
CREATE INDEX idx_bookings_professional ON public.bookings (professional_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);

-- ------------------------------------------------------------
-- SERVICE REQUESTS
-- ------------------------------------------------------------
CREATE TABLE public.service_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id           TEXT,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  profession        TEXT NOT NULL,
  location          TEXT NOT NULL,
  city              TEXT NOT NULL,
  price             TEXT,
  description       TEXT NOT NULL DEFAULT '',
  icon              TEXT NOT NULL DEFAULT 'briefcase-outline',
  icon_background   TEXT DEFAULT '#E8F5E9',
  images            TEXT[] NOT NULL DEFAULT '{}',
  image_keys        TEXT[] NOT NULL DEFAULT '{}',
  time_ago          TEXT,
  is_new            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  poster_name       TEXT NOT NULL,
  poster_avatar_url TEXT,
  poster_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  likes_count       INTEGER NOT NULL DEFAULT 0,
  max_offers        INTEGER NOT NULL DEFAULT 5,
  offers_count      INTEGER NOT NULL DEFAULT 0,
  offered_by        UUID[] NOT NULL DEFAULT '{}',
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX service_requests_mock_id_key ON public.service_requests (mock_id) WHERE mock_id IS NOT NULL;
CREATE INDEX idx_service_requests_city ON public.service_requests (city);
CREATE INDEX idx_service_requests_created_by ON public.service_requests (created_by);

CREATE TABLE public.service_request_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT,
  request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name       TEXT NOT NULL,
  user_avatar_url TEXT,
  text            TEXT NOT NULL,
  time_ago        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_comments_request ON public.service_request_comments (request_id);

CREATE TABLE public.service_request_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT,
  request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2),
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, user_id)
);

CREATE UNIQUE INDEX idx_sr_offers_mock
  ON public.service_request_offers (request_id, mock_id)
  WHERE mock_id IS NOT NULL;
CREATE INDEX idx_sr_offers_request ON public.service_request_offers (request_id);

CREATE TABLE public.service_request_likes (
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (request_id, user_id)
);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id    TEXT,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
               'booking', 'upcoming', 'message', 'payment',
               'verification', 'review', 'general'
             )),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  unread     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  time_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX notifications_mock_id_key ON public.notifications (mock_id) WHERE mock_id IS NOT NULL;
CREATE INDEX idx_notifications_user ON public.notifications (user_id);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id, unread);

CREATE TABLE public.admin_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id       TEXT UNIQUE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  channels      TEXT[] NOT NULL DEFAULT '{}',
  sent_to       TEXT NOT NULL DEFAULT 'all' CHECK (sent_to IN ('all', 'verified', 'subscribed', 'free')),
  sent_to_label TEXT NOT NULL DEFAULT 'All Users',
  status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'failed')),
  link          TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- SAVED PROVIDERS
-- ------------------------------------------------------------
CREATE TABLE public.saved_providers (
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, professional_id)
);

-- ------------------------------------------------------------
-- REFERENCE DATA
-- ------------------------------------------------------------
CREATE TABLE public.cities (
  name       TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.service_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id    TEXT UNIQUE,
  name       TEXT NOT NULL UNIQUE,
  icon       TEXT NOT NULL DEFAULT 'briefcase-outline',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- SUBSCRIPTIONS
-- ------------------------------------------------------------
CREATE TABLE public.subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id       TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  tagline       TEXT NOT NULL DEFAULT '',
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  yearly_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  popular       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscription_plan_features (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id    TEXT,
  plan_id    UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_plan_features_mock
  ON public.subscription_plan_features (plan_id, mock_id)
  WHERE mock_id IS NOT NULL;

CREATE TABLE public.subscription_plan_meta (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_title         TEXT NOT NULL DEFAULT '',
  promo_subtitle      TEXT NOT NULL DEFAULT '',
  yearly_save_percent INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.professional_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id                TEXT UNIQUE,
  professional_id        UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id                UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_code              TEXT NOT NULL DEFAULT 'free' CHECK (plan_code IN ('free', 'pro')),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  status_label           TEXT,
  start_date             DATE,
  end_date               DATE,
  revenuecat_app_user_id TEXT,
  store_product_id       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pro_subs_professional ON public.professional_subscriptions (professional_id);

-- ------------------------------------------------------------
-- VERIFICATION
-- ------------------------------------------------------------
CREATE TABLE public.verification_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT UNIQUE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_on    DATE,
  email           TEXT,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_apps_pro ON public.verification_applications (professional_id);

CREATE TABLE public.verification_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id        TEXT,
  application_id UUID NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  doc_type       TEXT NOT NULL DEFAULT 'other' CHECK (doc_type IN ('pdf', 'image', 'other')),
  uploaded       BOOLEAN NOT NULL DEFAULT FALSE,
  preview_key    TEXT,
  file_url       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_verification_docs_mock
  ON public.verification_documents (application_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- CHAT
-- ------------------------------------------------------------
CREATE TABLE public.conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id            TEXT UNIQUE,
  participant_a      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id         UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  last_message       TEXT NOT NULL DEFAULT '',
  last_message_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_distinct_participants CHECK (participant_a <> participant_b)
);

CREATE INDEX idx_conversations_a ON public.conversations (participant_a);
CREATE INDEX idx_conversations_b ON public.conversations (participant_b);

CREATE TABLE public.conversation_reads (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text            TEXT NOT NULL DEFAULT '',
  kind            TEXT NOT NULL DEFAULT 'text'
                  CHECK (kind IN ('text', 'location', 'location_stopped', 'request_card')),
  location_label  TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  card            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);
CREATE UNIQUE INDEX idx_messages_mock
  ON public.messages (conversation_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- FUNCTIONS + TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscription_plan_meta_updated_at
  BEFORE UPDATE ON public.subscription_plan_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER professional_subscriptions_updated_at
  BEFORE UPDATE ON public.professional_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER verification_applications_updated_at
  BEFORE UPDATE ON public.verification_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_role TEXT;
BEGIN
  next_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');
  IF next_role NOT IN ('user', 'admin', 'professional') THEN
    next_role := 'user';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, email, role, city, mock_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'User'),
    NEW.phone,
    NEW.email,
    next_role,
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'mock_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND NOT is_suspended
  );
$$;

CREATE OR REPLACE VIEW public.v_professionals_app AS
SELECT
  p.id,
  p.mock_id,
  COALESCE(pr.full_name, '') AS name,
  p.profession,
  p.city,
  p.price_from AS "priceFrom",
  p.avatar_url AS image_url,
  p.is_verified AS verified,
  p.subscribed,
  p.latitude,
  p.longitude,
  pr.role,
  COALESCE(p.email, pr.email) AS email,
  COALESCE(p.phone, pr.phone) AS phone,
  p.bio,
  p.rating,
  p.review_count,
  p.user_id,
  p.is_available,
  p.created_at,
  p.updated_at
FROM public.professionals p
JOIN public.profiles pr ON pr.id = p.user_id;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Public can view professionals"
  ON public.professionals FOR SELECT USING (true);

CREATE POLICY "Public can view services"
  ON public.services FOR SELECT USING (true);

CREATE POLICY "Public can view portfolio"
  ON public.portfolio_items FOR SELECT USING (true);

CREATE POLICY "Pros can manage own portfolio"
  ON public.portfolio_items FOR ALL
  USING (
    public.is_admin()
    OR auth.uid() IN (SELECT user_id FROM public.professionals WHERE id = professional_id)
  )
  WITH CHECK (
    public.is_admin()
    OR auth.uid() IN (SELECT user_id FROM public.professionals WHERE id = professional_id)
  );

CREATE POLICY "Public can view reviews"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = customer_id
    OR auth.uid() IN (SELECT user_id FROM public.professionals WHERE id = professional_id)
  );

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (
    public.is_admin()
    OR auth.uid() = customer_id
    OR auth.uid() IN (SELECT user_id FROM public.professionals WHERE id = professional_id)
  );

CREATE POLICY "Public can view service requests"
  ON public.service_requests FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert service requests"
  ON public.service_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update service requests"
  ON public.service_requests FOR UPDATE
  USING (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Owners can delete service requests"
  ON public.service_requests FOR DELETE
  USING (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Public can view request comments"
  ON public.service_request_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert comments"
  ON public.service_request_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Involved users can view offers"
  ON public.service_request_offers FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = user_id
    OR auth.uid() IN (SELECT created_by FROM public.service_requests WHERE id = request_id)
  );

CREATE POLICY "Users can submit own offers"
  ON public.service_request_offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view likes"
  ON public.service_request_likes FOR SELECT USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.service_request_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike themselves"
  ON public.service_request_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can view broadcast history"
  ON public.admin_notifications FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can send broadcasts"
  ON public.admin_notifications FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Users can manage own saved providers"
  ON public.saved_providers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view cities"
  ON public.cities FOR SELECT USING (true);

CREATE POLICY "Public can view service categories"
  ON public.service_categories FOR SELECT USING (true);

CREATE POLICY "Public can view subscription plans"
  ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Admins can update plans"
  ON public.subscription_plans FOR UPDATE USING (public.is_admin());

CREATE POLICY "Public can view plan features"
  ON public.subscription_plan_features FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan features"
  ON public.subscription_plan_features FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view plan meta"
  ON public.subscription_plan_meta FOR SELECT USING (true);

CREATE POLICY "Admins can update plan meta"
  ON public.subscription_plan_meta FOR UPDATE USING (public.is_admin());

CREATE POLICY "Public can view professional subscriptions"
  ON public.professional_subscriptions FOR SELECT USING (true);

CREATE POLICY "Users can view related verification"
  ON public.verification_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR auth.uid() IN (
    SELECT user_id FROM public.professionals WHERE id = professional_id
  ));

CREATE POLICY "Admins can update verification"
  ON public.verification_applications FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can view related verification docs"
  ON public.verification_documents FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.verification_applications va
      JOIN public.professionals p ON p.id = va.professional_id
      WHERE va.id = application_id
        AND (va.user_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = participant_a
    OR auth.uid() = participant_b
  );

CREATE POLICY "Users can insert conversations they join"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users manage own conversation reads"
  ON public.conversation_reads FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

CREATE TABLE public.password_reset_rate_limits (
  key_hash         TEXT PRIMARY KEY CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count    INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.password_reset_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.auth_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(p_email)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_email_exists(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_email_exists(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_password_reset_rate_limit(
  p_key_hash TEXT,
  p_max_attempts INTEGER DEFAULT 3,
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_attempts INTEGER;
BEGIN
  IF p_key_hash !~ '^[0-9a-f]{64}$' OR p_max_attempts < 1 OR p_window_seconds < 1 THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.password_reset_rate_limits
  WHERE window_started_at < now() - INTERVAL '1 day';

  INSERT INTO public.password_reset_rate_limits AS limits (
    key_hash,
    window_started_at,
    request_count
  )
  VALUES (p_key_hash, now(), 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN limits.window_started_at + p_window_seconds * INTERVAL '1 second' <= now()
        THEN now()
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at + p_window_seconds * INTERVAL '1 second' <= now()
        THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING request_count INTO current_attempts;

  RETURN current_attempts <= p_max_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_password_reset_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005173000_fix_professional_and_service_write_policies.sql
-- =====================================================================

-- Allow authenticated owners to manage professional profiles and their services.
-- Safe to run after the existing public-read policies.

create policy "Professionals can update own professional profile"
on public.professionals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Professionals can insert own professional profile"
on public.professionals
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Professionals can delete own professional profile"
on public.professionals
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Professionals can manage own services"
on public.services
for all
to authenticated
using (
  exists (
    select 1
    from public.professionals p
    where p.id = professional_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.professionals p
    where p.id = professional_id
      and p.user_id = (select auth.uid())
  )
);


-- Track the exact offer represented by an offer chat.
alter table public.conversations
  add column if not exists offer_id uuid references public.service_request_offers(id) on delete set null;

create index if not exists conversations_offer_id_idx
  on public.conversations(offer_id);


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005190000_harden_admin_notification_policies.sql
-- =====================================================================

-- Admin notification RLS hardening
drop policy if exists "Admins can send broadcasts" on public.admin_notifications;
create policy "Admins can send broadcasts"
on public.admin_notifications
for insert
to authenticated
with check (is_admin());

drop policy if exists "Admins can view broadcast history" on public.admin_notifications;
create policy "Admins can view broadcast history"
on public.admin_notifications
for select
to authenticated
using (is_admin());

drop policy if exists "Admins can create user notifications" on public.notifications;
create policy "Admins can create user notifications"
on public.notifications
for insert
to authenticated
with check (is_admin());


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005193000_optimize_auth_rls_policies.sql
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and not is_suspended
  );
$$;

alter policy "Users can update own profile" on public.profiles using ((select auth.uid()) = id or public.is_admin());

alter policy "Pros can manage own portfolio" on public.portfolio_items
using (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id))
with check (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Authenticated can insert reviews" on public.reviews with check ((select auth.uid()) is not null);

alter policy "Users can view own bookings" on public.bookings
using (public.is_admin() or (select auth.uid()) = customer_id or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Users can create bookings" on public.bookings with check ((select auth.uid()) = customer_id);

alter policy "Users can update own bookings" on public.bookings
using (public.is_admin() or (select auth.uid()) = customer_id or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Authenticated can insert service requests" on public.service_requests with check ((select auth.uid()) is not null);
alter policy "Owners can update service requests" on public.service_requests using ((select auth.uid()) = created_by or public.is_admin());
alter policy "Owners can delete service requests" on public.service_requests using ((select auth.uid()) = created_by or public.is_admin());
alter policy "Authenticated can insert comments" on public.service_request_comments with check ((select auth.uid()) is not null);

alter policy "Involved users can view offers" on public.service_request_offers
using (public.is_admin() or (select auth.uid()) = user_id or (select auth.uid()) in (select created_by from public.service_requests where id = request_id));
alter policy "Users can submit own offers" on public.service_request_offers with check ((select auth.uid()) = user_id);
alter policy "Users can like as themselves" on public.service_request_likes with check ((select auth.uid()) = user_id);
alter policy "Users can unlike themselves" on public.service_request_likes using ((select auth.uid()) = user_id);
alter policy "Users can view own notifications" on public.notifications using ((select auth.uid()) = user_id or public.is_admin());
alter policy "Users can update own notifications" on public.notifications using ((select auth.uid()) = user_id or public.is_admin());
alter policy "Users can manage own saved providers" on public.saved_providers using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "Users can view related verification" on public.verification_applications
using ((select auth.uid()) = user_id or public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

alter policy "Users can view related verification docs" on public.verification_documents
using (public.is_admin() or exists (
  select 1 from public.verification_applications va
  join public.professionals p on p.id = va.professional_id
  where va.id = application_id and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
));

alter policy "Users can view own conversations" on public.conversations
using (public.is_admin() or (select auth.uid()) = participant_a or (select auth.uid()) = participant_b);
alter policy "Users can insert conversations they join" on public.conversations
with check ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);
alter policy "Users manage own conversation reads" on public.conversation_reads
using ((select auth.uid()) = user_id or public.is_admin()) with check ((select auth.uid()) = user_id or public.is_admin());

alter policy "Users can view messages in own conversations" on public.messages
using (public.is_admin() or exists (
  select 1 from public.conversations c
  where c.id = conversation_id and (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
));

alter policy "Users can send messages in own conversations" on public.messages
with check ((select auth.uid()) = sender_id and exists (
  select 1 from public.conversations c
  where c.id = conversation_id and (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
));

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005193100_notification_triggers.sql
-- =====================================================================

create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_user uuid;
begin
  select p.user_id into target_user from public.professionals p where p.id = new.professional_id;
  if target_user is not null then
    insert into public.notifications (user_id,type,title,body,unread)
    values (target_user,'booking','New Booking Request','You have received a new booking request.',true);
  end if;
  return new;
end; $$;

create or replace function public.notify_offer_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_user uuid;
begin
  select sr.created_by into target_user from public.service_requests sr where sr.id = new.request_id;
  if target_user is not null and target_user <> new.user_id then
    insert into public.notifications (user_id,type,title,body,unread)
    values (target_user,'general','New Offer','Someone sent an offer of ₦' || to_char(new.amount,'FM999,999,999,990') || ' on your service request.',true);
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_booking_created on public.bookings;
create trigger trg_notify_booking_created after insert on public.bookings for each row execute function public.notify_booking_created();
drop trigger if exists trg_notify_offer_created on public.service_request_offers;
create trigger trg_notify_offer_created after insert on public.service_request_offers for each row execute function public.notify_offer_created();
revoke execute on function public.notify_booking_created() from anon, authenticated;
revoke execute on function public.notify_offer_created() from anon, authenticated;
grant execute on function public.notify_booking_created() to service_role;
grant execute on function public.notify_offer_created() to service_role;

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005193200_configure_production_subscription_plans.sql
-- =====================================================================

insert into public.subscription_plans (mock_id,name,tagline,monthly_price,yearly_price,popular,sort_order)
values ('basic','Basic','Get started for free',0,0,false,0),('pro','Pro','Unlock more opportunities',2500,25000,true,1)
on conflict (mock_id) do update set name=excluded.name,tagline=excluded.tagline,monthly_price=excluded.monthly_price,yearly_price=excluded.yearly_price,popular=excluded.popular,sort_order=excluded.sort_order,updated_at=now();

update public.subscription_plan_features f set label=v.label,sort_order=v.sort_order
from (values
('b1','basic','Basic profile',0),('b2','basic','Browse service requests',1),('b3','basic','Limited applications (5 per month)',2),('b4','basic','Basic job filters',3),('b5','basic','Community support',4),
('p1','pro','Verified / featured profile',0),('p2','pro','Unlimited applications',1),('p3','pro','Advanced job filters',2),('p4','pro','Priority nearby job alerts',3),('p5','pro','Earnings & performance dashboard',4),('p6','pro','Portfolio boost',5),('p7','pro','Dedicated support',6)) v(mock_id,plan_mock_id,label,sort_order)
join public.subscription_plans p on p.mock_id=v.plan_mock_id
where f.plan_id=p.id and f.mock_id=v.mock_id;

insert into public.subscription_plan_features (mock_id,plan_id,label,sort_order)
select v.mock_id,p.id,v.label,v.sort_order
from (values
('b1','basic','Basic profile',0),('b2','basic','Browse service requests',1),('b3','basic','Limited applications (5 per month)',2),('b4','basic','Basic job filters',3),('b5','basic','Community support',4),
('p1','pro','Verified / featured profile',0),('p2','pro','Unlimited applications',1),('p3','pro','Advanced job filters',2),('p4','pro','Priority nearby job alerts',3),('p5','pro','Earnings & performance dashboard',4),('p6','pro','Portfolio boost',5),('p7','pro','Dedicated support',6)) v(mock_id,plan_mock_id,label,sort_order)
join public.subscription_plans p on p.mock_id=v.plan_mock_id
where not exists (select 1 from public.subscription_plan_features f where f.plan_id=p.id and f.mock_id=v.mock_id);

insert into public.subscription_plan_meta (promo_title,promo_subtitle,yearly_save_percent)
select 'Unlock more opportunities','Upgrade to get advanced tools, more visibility and grow your business faster.',17
where not exists (select 1 from public.subscription_plan_meta);

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005193300_reduce_duplicate_permissive_policies.sql
-- =====================================================================

drop policy if exists "Pros can manage own portfolio" on public.portfolio_items;
create policy "Pros can insert own portfolio" on public.portfolio_items for insert to authenticated with check (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));
create policy "Pros can update own portfolio" on public.portfolio_items for update to authenticated using (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id)) with check (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));
create policy "Pros can delete own portfolio" on public.portfolio_items for delete to authenticated using (public.is_admin() or (select auth.uid()) in (select user_id from public.professionals where id = professional_id));

drop policy if exists "Professionals can manage own services" on public.services;
create policy "Professionals can insert own services" on public.services for insert to authenticated with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid())));
create policy "Professionals can update own services" on public.services for update to authenticated using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid())));
create policy "Professionals can delete own services" on public.services for delete to authenticated using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = (select auth.uid())));

drop policy if exists "Admins can manage plan features" on public.subscription_plan_features;
create policy "Admins can insert plan features" on public.subscription_plan_features for insert to authenticated with check (public.is_admin());
create policy "Admins can update plan features" on public.subscription_plan_features for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete plan features" on public.subscription_plan_features for delete to authenticated using (public.is_admin());

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005193400_harden_functions_and_fk_indexes.sql
-- =====================================================================

create index if not exists idx_admin_notifications_created_by on public.admin_notifications(created_by);
create index if not exists idx_conversation_reads_user_id on public.conversation_reads(user_id);
create index if not exists idx_conversations_booking_id on public.conversations(booking_id);
create index if not exists idx_conversations_service_request_id on public.conversations(service_request_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_professional_subscriptions_plan_id on public.professional_subscriptions(plan_id);
create index if not exists idx_professional_subscriptions_user_id on public.professional_subscriptions(user_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_saved_providers_professional_id on public.saved_providers(professional_id);
create index if not exists idx_service_request_comments_user_id on public.service_request_comments(user_id);
create index if not exists idx_service_request_likes_user_id on public.service_request_likes(user_id);
create index if not exists idx_service_request_offers_professional_id on public.service_request_offers(professional_id);
create index if not exists idx_service_request_offers_user_id on public.service_request_offers(user_id);
create index if not exists idx_verification_applications_user_id on public.verification_applications(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.notify_booking_created() from public, anon, authenticated;
revoke execute on function public.notify_offer_created() from public, anon, authenticated;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005193500_optimize_remaining_update_rls.sql
-- =====================================================================

alter policy "Users can update own conversations" on public.conversations
using ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);

alter policy "Request owners can update offers" on public.service_request_offers
using ((select auth.uid()) in (select created_by from public.service_requests where id = request_id));

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005195000_comment_edit_delete_policies.sql
-- =====================================================================

-- Allow users to edit and delete only their own service-request comments.

drop policy if exists "Users can update own comments" on public.service_request_comments;
create policy "Users can update own comments"
on public.service_request_comments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own comments" on public.service_request_comments;
create policy "Users can delete own comments"
on public.service_request_comments
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005200000_fix_service_category_icons.sql
-- =====================================================================

-- Normalize service category icons to valid MaterialCommunityIcons names.
update public.service_categories
set icon = case name
  when 'Barber' then 'content-cut'
  when 'Nail Tech' then 'hand-wash-outline'
  else icon
end
where name in ('Barber', 'Nail Tech');


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005201000_add_verification_submission_policies.sql
-- =====================================================================

drop policy if exists "Users can create verification applications" on public.verification_applications;
create policy "Users can create verification applications"
on public.verification_applications
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.professionals p
    where p.id = professional_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own verification applications" on public.verification_applications;
create policy "Users can update own verification applications"
on public.verification_applications
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = user_id
  and status in ('pending','rejected')
);

drop policy if exists "Users can create verification documents" on public.verification_documents;
create policy "Users can create verification documents"
on public.verification_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.verification_applications va
    join public.professionals p on p.id = va.professional_id
    where va.id = application_id
      and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
  )
);

drop policy if exists "Users can update verification documents" on public.verification_documents;
create policy "Users can update verification documents"
on public.verification_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.verification_applications va
    join public.professionals p on p.id = va.professional_id
    where va.id = application_id
      and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.verification_applications va
    join public.professionals p on p.id = va.professional_id
    where va.id = application_id
      and (va.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
  )
);

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005202000_protect_admin_profile_controls.sql
-- =====================================================================

-- Protect suspension and role fields from non-admin profile updates.
create or replace function public.prevent_non_admin_profile_privilege_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.is_suspended is distinct from old.is_suspended then
      raise exception 'Only admins can suspend or unsuspend users';
    end if;

    if new.role is distinct from old.role then
      raise exception 'Only admins can change user roles';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields on public.profiles;

create trigger protect_profile_admin_fields
before update on public.profiles
for each row
execute function public.prevent_non_admin_profile_privilege_changes();

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005202100_allow_admin_subscription_management.sql
-- =====================================================================

-- Allow admins to manage professional subscription records.
drop policy if exists "Admins can manage professional subscriptions" on public.professional_subscriptions;

create policy "Admins can manage professional subscriptions"
on public.professional_subscriptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005203000_allow_delete_own_request_comments.sql
-- =====================================================================

-- Allow authenticated users to delete their own service request comments.
CREATE POLICY "Users can delete own comments"
  ON public.service_request_comments
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005210200_allow_admin_professional_subscription_state.sql
-- =====================================================================

-- Allow administrators to keep the professionals.subscribed flag in sync
-- when managing subscriptions from the admin dashboard.

create policy "Admins can update professionals"
on public.professionals
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005212000_enable_professionals_realtime.sql
-- =====================================================================

-- Keep professional subscription state synchronized with frontend clients in real time.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'professionals'
  ) then
    alter publication supabase_realtime add table public.professionals;
  end if;
end
$$;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005213000_link_subscription_plan_codes.sql
-- =====================================================================

-- Use stable database plan/feature codes instead of client mock IDs.
alter table public.subscription_plans add column if not exists code text;
alter table public.subscription_plan_features add column if not exists code text;

update public.subscription_plans
set code = lower(coalesce(code, mock_id))
where code is null or btrim(code) = '';

update public.subscription_plan_features
set code = coalesce(code, mock_id)
where code is null or btrim(code) = '';

create unique index if not exists subscription_plans_code_key
on public.subscription_plans(code);

create unique index if not exists subscription_plan_features_plan_code_key
on public.subscription_plan_features(plan_id, code);

alter table public.subscription_plans alter column code set not null;
alter table public.subscription_plan_features alter column code set not null;

do $
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subscription_plans') then
    alter publication supabase_realtime add table public.subscription_plans;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subscription_plan_features') then
    alter publication supabase_realtime add table public.subscription_plan_features;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subscription_plan_meta') then
    alter publication supabase_realtime add table public.subscription_plan_meta;
  end if;
end
$;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261005213100_allow_admin_subscription_plan_inserts.sql
-- =====================================================================

create policy "Admins can insert subscription plans"
on public.subscription_plans
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can insert plan meta"
on public.subscription_plan_meta
for insert
to authenticated
with check ((select public.is_admin()));


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006001000_add_welcome_notification_on_signup.sql
-- =====================================================================

-- Automatically create the first in-app notification for every new Doovly user.
-- The notification UI already supplies the Doovly logo for general/system notifications.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_role TEXT;
BEGIN
  next_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');

  IF next_role NOT IN ('user', 'admin', 'professional') THEN
    next_role := 'user';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, email, role, city, mock_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'User'),
    NEW.phone,
    NEW.email,
    next_role,
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'mock_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    unread,
    avatar_url,
    time_label
  )
  VALUES (
    NEW.id,
    'general',
    'Welcome to Doovly 👋',
    'Thanks for joining Doovly! Explore services and find trusted professionals near you.',
    TRUE,
    NULL,
    'Just now'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006002000_enable_notification_realtime.sql
-- =====================================================================

-- Enable realtime delivery for user in-app notifications.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006003000_allow_users_to_delete_notifications.sql
-- =====================================================================

-- Allow authenticated users to delete only their own notifications.
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006004000_add_other_service_category.sql
-- =====================================================================

-- Add a catch-all service/profession category for new and unlisted professions.
INSERT INTO public.service_categories (mock_id, name, icon, sort_order)
SELECT
  'other',
  'Other',
  'briefcase-outline',
  COALESCE((SELECT MAX(sort_order) FROM public.service_categories), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories WHERE LOWER(TRIM(name)) = 'other'
);


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006004100_default_profession_to_other.sql
-- =====================================================================

-- Store a default profession on every user profile without creating a professional listing.
-- New registrations receive Other automatically; Edit Profile updates this field.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profession TEXT NOT NULL DEFAULT 'Other';

UPDATE public.profiles
SET profession = 'Other'
WHERE profession IS NULL OR BTRIM(profession) = '';


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006040000_add_expo_push_notifications.sql
-- =====================================================================

alter table public.profiles
  add column if not exists expo_push_token text;

create index if not exists profiles_expo_push_token_idx
  on public.profiles (expo_push_token)
  where expo_push_token is not null;

create or replace function public.send_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
  payload jsonb;
begin
  select p.expo_push_token into token
  from public.profiles p
  where p.id = new.user_id
    and p.expo_push_token is not null
    and length(trim(p.expo_push_token)) > 0
  limit 1;

  if token is null then
    return new;
  end if;

  payload := jsonb_build_object(
    'to', token,
    'title', coalesce(new.title, 'Doovly'),
    'body', coalesce(new.body, ''),
    'sound', 'default',
    'data', coalesce(new.data, jsonb_build_object('notificationId', new.id::text)),
    'priority', 'high'
  );

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := payload
  );

  return new;
exception when others then
  raise warning '[push notification] %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notifications_send_push on public.notifications;

create trigger notifications_send_push
after insert on public.notifications
for each row
execute function public.send_notification_push();

revoke all on function public.send_notification_push() from public, anon, authenticated;
grant execute on function public.send_notification_push() to postgres;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006120000_chat_coins_pro_images_calls_location_rules.sql
-- =====================================================================

-- Chat monetization and privacy rules
-- 15 free chat coins per user, Pro unlimited text/images/calls.
-- Location sharing is only allowed after booking/offer approval.

insert into public.service_categories (name, icon, sort_order)
select 'Other', 'briefcase-outline', coalesce(max(sort_order), 0) + 1
from public.service_categories
where not exists (
  select 1 from public.service_categories where lower(trim(name)) = 'other'
);

alter table public.professionals alter column profession set default 'Other';
alter table public.profiles alter column profession set default 'Other';

update public.profiles
set profession = 'Other'
where profession is null or btrim(profession) = '';

create table if not exists public.chat_credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  remaining integer not null default 15,
  updated_at timestamptz not null default now(),
  constraint chat_credits_remaining_check check (remaining >= 0)
);

alter table public.chat_credits enable row level security;

drop policy if exists "Users can view own chat credits" on public.chat_credits;
create policy "Users can view own chat credits"
on public.chat_credits
for select to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.chat_credits from anon, authenticated;

insert into public.chat_credits (user_id, remaining)
select id, 15 from public.profiles
on conflict (user_id) do nothing;

alter table public.messages add column if not exists image_url text;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
check (kind = any (array[
  'text'::text, 'image'::text, 'location'::text,
  'location_stopped'::text, 'request_card'::text, 'system'::text
]));

create or replace function public.is_chat_pro(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.professionals p
    where p.user_id = p_user_id and p.subscribed = true
  );
$$;

revoke execute on function public.is_chat_pro(uuid) from public, anon, authenticated;

create or replace function public.enforce_chat_message_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pro_user boolean;
  credits integer;
  booking_status text;
  offer_status text;
begin
  if new.kind in ('text', 'image') then
    if new.sender_id <> auth.uid() then
      raise exception 'You can only send messages as yourself';
    end if;

    if not exists (
      select 1 from public.conversations c
      where c.id = new.conversation_id
        and (c.participant_a = new.sender_id or c.participant_b = new.sender_id)
    ) then
      raise exception 'You are not a participant in this conversation';
    end if;

    pro_user := public.is_chat_pro(new.sender_id);

    if new.kind = 'image' and not pro_user then
      raise exception 'IMAGE_CHAT_PRO_REQUIRED';
    end if;

    if not pro_user then
      insert into public.chat_credits (user_id, remaining)
      values (new.sender_id, 15)
      on conflict (user_id) do nothing;

      update public.chat_credits
      set remaining = remaining - 1, updated_at = now()
      where user_id = new.sender_id and remaining > 0
      returning remaining into credits;

      if not found then
        raise exception 'CHAT_CREDITS_EXHAUSTED';
      end if;
    end if;
  end if;

  if new.kind = 'location' then
    select lower(coalesce(b.status, ''))
    into booking_status
    from public.conversations c
    left join public.bookings b on b.id = c.booking_id
    where c.id = new.conversation_id;

    if booking_status is not null and booking_status <> '' then
      if booking_status not in ('accepted', 'ongoing', 'upcoming', 'booked', 'awaiting_approval') then
        raise exception 'LOCATION_REQUIRES_PROVIDER_APPROVAL';
      end if;
    else
      select lower(coalesce(sro.status, ''))
      into offer_status
      from public.conversations c
      left join public.service_request_offers sro on sro.id = c.offer_id
      where c.id = new.conversation_id;

      if offer_status is not null and offer_status <> '' and offer_status <> 'accepted' then
        raise exception 'LOCATION_REQUIRES_PROVIDER_APPROVAL';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_chat_message_rules on public.messages;
create trigger trg_enforce_chat_message_rules
before insert on public.messages
for each row execute function public.enforce_chat_message_rules();

revoke execute on function public.enforce_chat_message_rules() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  next_role text;
begin
  next_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');

  if next_role not in ('user', 'admin', 'professional') then
    next_role := 'user';
  end if;

  insert into public.profiles (
    id, full_name, phone, email, role, city, profession, mock_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'User'),
    new.phone,
    new.email,
    next_role,
    new.raw_user_meta_data ->> 'city',
    'Other',
    new.raw_user_meta_data ->> 'mock_id'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

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

revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006121500_chat_system_message_kind.sql
-- =====================================================================

-- Keep booking accept/decline events out of free chat coin usage.

alter table public.messages drop constraint if exists messages_kind_check;

alter table public.messages add constraint messages_kind_check
check (kind = any (array[
  'text'::text,
  'image'::text,
  'location'::text,
  'location_stopped'::text,
  'request_card'::text,
  'system'::text
]));


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006123000_fix_new_account_professional_profiles.sql
-- =====================================================================

-- Create a professional profile automatically for every normal Doovly account.
-- This keeps the existing profile, services, booking and offer flows usable
-- immediately after signup without changing the account's role.

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
  next_phone := coalesce(
    nullif(btrim(new.phone), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  );

  insert into public.profiles (
    id, full_name, phone, email, role, city, profession, mock_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'User'),
    new.phone,
    new.email,
    next_role,
    next_city,
    next_profession,
    new.raw_user_meta_data ->> 'mock_id'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    city = coalesce(excluded.city, public.profiles.city),
    profession = coalesce(excluded.profession, public.profiles.profession);

  if next_role <> 'admin' then
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

-- Repair accounts created before this trigger was fixed.
insert into public.professionals (
  user_id,
  profession,
  city,
  price_from,
  price_from_value,
  email,
  phone
)
select
  p.id,
  coalesce(nullif(btrim(p.profession), ''), 'Other'),
  coalesce(nullif(btrim(p.city), ''), 'Lagos'),
  '₦0',
  0,
  p.email,
  p.phone
from public.profiles p
left join public.professionals pro on pro.user_id = p.id
where pro.id is null
  and p.role <> 'admin';


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006130000_booking_conversation_trigger.sql
-- =====================================================================

-- Always create the booking conversation at the database boundary.
-- This prevents a booking from being created without its chat conversation.

create or replace function public.create_booking_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  professional_user uuid;
begin
  select p.user_id
    into professional_user
  from public.professionals p
  where p.id = new.professional_id;

  if professional_user is null
     or professional_user = new.customer_id then
    return new;
  end if;

  insert into public.conversations (
    participant_a,
    participant_b,
    booking_id,
    last_message,
    last_message_at
  )
  values (
    new.customer_id,
    professional_user,
    new.id,
    'Booking request: ' || coalesce(new.title, 'Booking'),
    now()
  )
  on conflict (booking_id) do nothing;

  return new;
end;
$function$;

drop trigger if exists trg_create_booking_conversation on public.bookings;

create trigger trg_create_booking_conversation
after insert on public.bookings
for each row
execute function public.create_booking_conversation();

-- Repair older bookings that were created without a conversation.
insert into public.conversations (
  participant_a,
  participant_b,
  booking_id,
  last_message,
  last_message_at
)
select
  b.customer_id,
  p.user_id,
  b.id,
  'Booking request: ' || coalesce(b.title, 'Booking'),
  coalesce(b.created_at, now())
from public.bookings b
join public.professionals p on p.id = b.professional_id
left join public.conversations c on c.booking_id = b.id
where c.id is null
  and p.user_id <> b.customer_id;


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006140000_booking_chat_data_and_location_lock.sql
-- =====================================================================

create or replace function public.create_booking_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  professional_user uuid;
  conversation_uuid uuid;
begin
  select p.user_id into professional_user
  from public.professionals p
  where p.id = new.professional_id;

  if professional_user is null or professional_user = new.customer_id then
    return new;
  end if;

  insert into public.conversations (
    participant_a, participant_b, booking_id, last_message, last_message_at
  )
  values (
    new.customer_id,
    professional_user,
    new.id,
    'Booking request: ' || coalesce(new.title, new.service_name, 'Booking'),
    now()
  )
  on conflict (booking_id) do update
    set last_message = excluded.last_message,
        last_message_at = excluded.last_message_at
  returning id into conversation_uuid;

  insert into public.messages (conversation_id, sender_id, text, kind, card)
  select
    conversation_uuid,
    new.customer_id,
    'Booking request: ' || coalesce(new.title, new.service_name, 'Booking'),
    'request_card',
    jsonb_build_object(
      'kind', 'booking',
      'title', coalesce(new.title, new.service_name, 'Booking'),
      'category', new.service_name,
      'location', coalesce(new.location, new.address),
      'description', new.notes,
      'amount', coalesce(new.amount, 0),
      'date', new.display_date,
      'statusLabel',
        case lower(coalesce(new.status, 'pending'))
          when 'pending' then 'Waiting for professional to accept'
          when 'declined' then 'This booking was declined'
          when 'cancelled' then 'This booking was declined'
          else 'Accepted'
        end
    )
  where not exists (
    select 1 from public.messages m
    where m.conversation_id = conversation_uuid
      and m.kind = 'request_card'
  );

  return new;
end;
$function$;

revoke execute on function public.create_booking_conversation() from public, anon, authenticated;

drop policy if exists "Users can send messages in own conversations" on public.messages;

create policy "Users can send messages in own conversations"
on public.messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (c.participant_a = (select auth.uid()) or c.participant_b = (select auth.uid()))
      and (
        messages.kind <> 'location'
        or c.booking_id is null
        or exists (
          select 1 from public.bookings b
          where b.id = c.booking_id
            and lower(coalesce(b.status, 'pending')) = 'accepted'
        )
        or (
          c.offer_id is not null
          and exists (
            select 1 from public.service_request_offers o
            where o.id = c.offer_id
              and lower(coalesce(o.status, 'pending')) = 'accepted'
          )
        )
      )
  )
);

delete from public.messages m
where m.kind = 'location'
  and exists (
    select 1
    from public.conversations c
    left join public.bookings b on b.id = c.booking_id
    left join public.service_request_offers o on o.id = c.offer_id
    where c.id = m.conversation_id
      and (
        (b.id is not null and lower(coalesce(b.status, 'pending')) <> 'accepted')
        or (o.id is not null and lower(coalesce(o.status, 'pending')) <> 'accepted')
      )
  );

insert into public.messages (conversation_id, sender_id, text, kind, card)
select
  c.id,
  b.customer_id,
  'Booking request: ' || coalesce(b.title, b.service_name, 'Booking'),
  'request_card',
  jsonb_build_object(
    'kind', 'booking',
    'title', coalesce(b.title, b.service_name, 'Booking'),
    'category', b.service_name,
    'location', coalesce(b.location, b.address),
    'description', b.notes,
    'amount', coalesce(b.amount, 0),
    'date', b.display_date,
    'statusLabel',
      case lower(coalesce(b.status, 'pending'))
        when 'pending' then 'Waiting for professional to accept'
        when 'declined' then 'This booking was declined'
        when 'cancelled' then 'This booking was declined'
        else 'Accepted'
      end
  )
from public.conversations c
join public.bookings b on b.id = c.booking_id
where c.booking_id is not null
  and not exists (
    select 1 from public.messages m
    where m.conversation_id = c.id and m.kind = 'request_card'
  );

-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006143000_prevent_duplicate_booking_and_offer_chat.sql
-- =====================================================================

-- Prevent duplicate booking orders and make offers follow the same chat-card flow.
alter table public.bookings
  add column if not exists source_offer_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_source_offer_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_source_offer_id_fkey
      foreign key (source_offer_id)
      references public.service_request_offers(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists bookings_source_offer_id_unique
  on public.bookings(source_offer_id) where source_offer_id is not null;

create unique index if not exists conversations_offer_id_unique
  on public.conversations(offer_id) where offer_id is not null;

create or replace function public.prevent_duplicate_booking_order()
returns trigger
language plpgsql
as $function$
declare existing_booking public.bookings;
begin
  select b.* into existing_booking
  from public.bookings b
  where b.customer_id = new.customer_id
    and b.professional_id = new.professional_id
    and lower(coalesce(b.title,'')) = lower(coalesce(new.title,''))
    and coalesce(b.amount,0) = coalesce(new.amount,0)
    and lower(coalesce(b.location,'')) = lower(coalesce(new.location,''))
    and lower(coalesce(b.status,'pending')) in ('pending','accepted')
  order by b.created_at desc limit 1;
  if existing_booking.id is not null then return existing_booking; end if;
  return new;
end;
$function$;

drop trigger if exists trg_prevent_duplicate_booking_order on public.bookings;
create trigger trg_prevent_duplicate_booking_order
before insert on public.bookings
for each row execute function public.prevent_duplicate_booking_order();

create or replace function public.create_offer_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare request_row record; conversation_uuid uuid;
begin
  select r.created_by,r.title,r.category,r.location,r.city,r.description
    into request_row from public.service_requests r where r.id=new.request_id;

  if request_row.created_by is null or new.user_id is null
     or request_row.created_by=new.user_id then return new; end if;

  insert into public.conversations
    (participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at)
  values
    (request_row.created_by,new.user_id,new.request_id,new.id,
     'Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||
     ' on "'||coalesce(request_row.title,'Service request')||'"',now())
  on conflict (offer_id) do update
    set last_message=excluded.last_message,last_message_at=excluded.last_message_at
  returning id into conversation_uuid;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  select conversation_uuid,new.user_id,
    'Offer: ₦'||to_char(new.amount,'FM999,999,999,990')||
    ' on "'||coalesce(request_row.title,'Service request')||'"',
    'request_card',
    jsonb_build_object(
      'kind','offer','title',coalesce(request_row.title,'Service request'),
      'category',request_row.category,'location',coalesce(request_row.location,request_row.city),
      'description',request_row.description,'amount',new.amount,
      'date',to_char(now(),'DD Mon YYYY'),
      'statusLabel','Waiting for customer to accept')
  where not exists(
    select 1 from public.messages m
    where m.conversation_id=conversation_uuid and m.kind='request_card');

  return new;
end;
$function$;

drop trigger if exists trg_create_offer_conversation on public.service_request_offers;
create trigger trg_create_offer_conversation
after insert on public.service_request_offers
for each row execute function public.create_offer_conversation();

revoke execute on function public.create_offer_conversation() from public,anon,authenticated;

drop policy if exists "Users can send messages in own conversations" on public.messages;
create policy "Users can send messages in own conversations"
on public.messages for insert to authenticated
with check (
  (select auth.uid())=sender_id
  and exists(
    select 1 from public.conversations c
    where c.id=messages.conversation_id
      and (c.participant_a=(select auth.uid()) or c.participant_b=(select auth.uid()))
      and (
        messages.kind <> 'location'
        or (
          c.booking_id is not null and exists(
            select 1 from public.bookings b
            where b.id=c.booking_id
              and lower(coalesce(b.status,'pending'))='accepted')
        )
        or (
          c.offer_id is not null and exists(
            select 1 from public.service_request_offers o
            where o.id=c.offer_id
              and lower(coalesce(o.status,'pending'))='accepted')
        )
      )
  )
);

insert into public.conversations
  (participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at)
select r.created_by,o.user_id,o.request_id,o.id,
  'Offer: ₦'||to_char(o.amount,'FM999,999,999,990')||
  ' on "'||coalesce(r.title,'Service request')||'"',now()
from public.service_request_offers o
join public.service_requests r on r.id=o.request_id
where not exists(select 1 from public.conversations c where c.offer_id=o.id)
  and r.created_by is not null and o.user_id is not null and r.created_by<>o.user_id;

insert into public.messages(conversation_id,sender_id,text,kind,card)
select c.id,o.user_id,
  'Offer: ₦'||to_char(o.amount,'FM999,999,999,990')||
  ' on "'||coalesce(r.title,'Service request')||'"',
  'request_card',
  jsonb_build_object(
    'kind','offer','title',coalesce(r.title,'Service request'),
    'category',r.category,'location',coalesce(r.location,r.city),
    'description',r.description,'amount',o.amount,
    'date',to_char(o.created_at,'DD Mon YYYY'),
    'statusLabel',case lower(coalesce(o.status,'pending'))
      when 'accepted' then 'Offer accepted'
      when 'declined' then 'Offer declined'
      else 'Waiting for customer to accept' end)
from public.service_request_offers o
join public.service_requests r on r.id=o.request_id
join public.conversations c on c.offer_id=o.id
where not exists(
  select 1 from public.messages m
  where m.conversation_id=c.id and m.kind='request_card');


-- =====================================================================
-- SOURCE FILE: supabase/migrations/20261006143230_one_chat_thread_per_user_pair.sql
-- =====================================================================

-- Keep exactly one social-style DM thread per user pair.
-- Booking/request records reuse that thread; acceptance controls when text is unlocked.

with ranked as (
  select
    id,
    first_value(id) over (
      partition by least(participant_a, participant_b), greatest(participant_a, participant_b)
      order by created_at desc, id desc
    ) as keep_id,
    row_number() over (
      partition by least(participant_a, participant_b), greatest(participant_a, participant_b)
      order by created_at desc, id desc
    ) as rn
  from public.conversations
)
update public.messages m
set conversation_id = r.keep_id
from ranked r
where m.conversation_id = r.id
  and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by least(participant_a, participant_b), greatest(participant_a, participant_b)
      order by created_at desc, id desc
    ) as rn
  from public.conversations
)
delete from public.conversations c
using ranked r
where c.id = r.id
  and r.rn > 1;

create unique index if not exists conversations_one_thread_per_pair
  on public.conversations (
    least(participant_a, participant_b),
    greatest(participant_a, participant_b)
  );

create or replace function public.create_booking_conversation()
returns trigger language plpgsql security definer set search_path=public as $function$
declare
  professional_user uuid;
  conversation_uuid uuid;
begin
  select p.user_id into professional_user from public.professionals p where p.id = new.professional_id;
  if professional_user is null or professional_user = new.customer_id then return new; end if;

  select c.id into conversation_uuid
  from public.conversations c
  where (c.participant_a = new.customer_id and c.participant_b = professional_user)
     or (c.participant_b = new.customer_id and c.participant_a = professional_user)
  order by c.last_message_at desc nulls last limit 1;

  if conversation_uuid is not null then
    update public.conversations
    set participant_a = new.customer_id,
        participant_b = professional_user,
        booking_id = new.id,
        service_request_id = null,
        offer_id = null,
        last_message = 'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),
        last_message_at = now()
    where id = conversation_uuid;
  else
    insert into public.conversations(participant_a,participant_b,booking_id,last_message,last_message_at)
    values(new.customer_id,professional_user,new.id,
      'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),now())
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(
    conversation_uuid,new.customer_id,
    'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),
    'request_card',
    jsonb_build_object(
      'kind','booking',
      'title',coalesce(new.title,new.service_name,'Booking'),
      'category',new.service_name,
      'location',coalesce(new.location,new.address),
      'description',new.notes,
      'amount',coalesce(new.amount,0),
      'date',new.display_date,
      'statusLabel',
        case lower(coalesce(new.status,'pending'))
          when 'pending' then 'Waiting for professional to accept'
          when 'declined' then 'This booking was declined'
          when 'cancelled' then 'This booking was declined'
          else 'Accepted'
        end
    )
  );
  return new;
end; $function$;

create or replace function public.create_offer_conversation()
returns trigger language plpgsql security definer set search_path=public as $function$
declare
  request_row record;
  conversation_uuid uuid;
begin
  select r.created_by,r.title,r.category,r.location,r.city,r.description
  into request_row
  from public.service_requests r where r.id = new.request_id;

  if request_row.created_by is null or new.user_id is null or request_row.created_by = new.user_id then return new; end if;

  select c.id into conversation_uuid
  from public.conversations c
  where (c.participant_a = request_row.created_by and c.participant_b = new.user_id)
     or (c.participant_b = request_row.created_by and c.participant_a = new.user_id)
  order by c.last_message_at desc nulls last limit 1;

  if conversation_uuid is not null then
    update public.conversations
    set participant_a = request_row.created_by,
        participant_b = new.user_id,
        service_request_id = new.request_id,
        offer_id = new.id,
        booking_id = null,
        last_message = 'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
          ' on "' || coalesce(request_row.title,'Service request') || '"',
        last_message_at = now()
    where id = conversation_uuid;
  else
    insert into public.conversations(
      participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at
    )
    values(
      request_row.created_by,new.user_id,new.request_id,new.id,
      'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
        ' on "' || coalesce(request_row.title,'Service request') || '"',now()
    )
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(
    conversation_uuid,new.user_id,
    'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
      ' on "' || coalesce(request_row.title,'Service request') || '"',
    'request_card',
    jsonb_build_object(
      'kind','offer',
      'title',coalesce(request_row.title,'Service request'),
      'category',request_row.category,
      'location',coalesce(request_row.location,request_row.city),
      'description',request_row.description,
      'amount',new.amount,
      'date',to_char(new.created_at,'DD Mon YYYY'),
      'statusLabel',
        case when lower(coalesce(new.status,'pending'))='accepted'
          then 'Offer accepted'
          else 'Waiting for customer to accept'
        end
    )
  );
  return new;
end; $function$;
