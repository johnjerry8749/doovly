-- ============================================================
-- Doovly schema
-- One migration. Replaces 001_initial_schema.sql + 002_mock_parity.sql.
-- mock_id = app id ("1", "u1", "b1"). id = production UUID.
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
