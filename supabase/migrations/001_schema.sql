-- ============================================================
-- Doovly schema
-- One file. Matches src/data/* and the app flow.
-- mock_id = current app id ("1", "u1", "b1"). id = production UUID.
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
  member_since      DATE,
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

-- ------------------------------------------------------------
-- PORTFOLIO
-- ------------------------------------------------------------
CREATE TABLE public.portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  mock_id         TEXT,
  description     TEXT NOT NULL,
  image_key       TEXT NOT NULL,
  image_url       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX portfolio_items_mock_key
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_professional ON public.reviews (professional_id);

-- ------------------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------------------
CREATE TABLE public.bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT,
  customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  service_name    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  amount          NUMERIC(12,2),
  location        TEXT,
  address         TEXT,
  notes           TEXT,
  scheduled_at    TIMESTAMPTZ,
  rating          NUMERIC(3,2),
  reviews_count   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_comments_request ON public.service_request_comments (request_id);

CREATE TABLE public.service_request_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT UNIQUE,
  request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, user_id)
);

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
  sent_to       TEXT NOT NULL CHECK (sent_to IN ('all', 'verified', 'subscribed', 'free')),
  sent_to_label TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('Sent', 'Scheduled', 'Failed')),
  link          TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  name       TEXT PRIMARY KEY,
  icon       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- SUBSCRIPTIONS
-- ------------------------------------------------------------
CREATE TABLE public.subscription_plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  tagline       TEXT NOT NULL,
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  yearly_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  popular       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.subscription_plan_features (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.app_settings (
  id                  TEXT PRIMARY KEY,
  promo_title         TEXT NOT NULL,
  promo_subtitle      TEXT NOT NULL,
  yearly_save_percent INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT UNIQUE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('Pro', 'Free')),
  status          TEXT NOT NULL CHECK (status IN ('Active', 'Expired', 'Cancelled')),
  status_label    TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- VERIFICATION
-- ------------------------------------------------------------
CREATE TABLE public.verification_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT UNIQUE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  submitted_on    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.verification_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id        TEXT UNIQUE,
  application_id UUID NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  doc_type       TEXT NOT NULL CHECK (doc_type IN ('pdf', 'image', 'other')),
  uploaded       BOOLEAN NOT NULL DEFAULT TRUE,
  preview_key    TEXT,
  file_url       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- CHAT
-- ------------------------------------------------------------
CREATE TABLE public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT UNIQUE,
  booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id         TEXT,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'text'
                  CHECK (kind IN ('text', 'location', 'location_stopped', 'request_card')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX messages_conv_mock_key
  ON public.messages (conversation_id, mock_id)
  WHERE mock_id IS NOT NULL;

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);

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

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER verification_applications_updated_at
  BEFORE UPDATE ON public.verification_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, role, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    NEW.phone,
    NEW.email,
    'user',
    NEW.raw_user_meta_data ->> 'city'
  )
  ON CONFLICT (id) DO NOTHING;
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
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Public can view categories"
  ON public.service_categories FOR SELECT USING (true);

CREATE POLICY "Public can view plans"
  ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Admins can update plans"
  ON public.subscription_plans FOR UPDATE USING (public.is_admin());

CREATE POLICY "Public can view plan features"
  ON public.subscription_plan_features FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan features"
  ON public.subscription_plan_features FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view app settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update subscriptions"
  ON public.user_subscriptions FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can view related verification"
  ON public.verification_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update verification"
  ON public.verification_applications FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can view related verification docs"
  ON public.verification_documents FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() IN (
      SELECT user_id FROM public.verification_applications WHERE id = application_id
    )
  );

CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() IN (
      SELECT user_id FROM public.conversation_members WHERE conversation_id = id
    )
  );

CREATE POLICY "Members can view membership"
  ON public.conversation_members FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() IN (
      SELECT cm.user_id FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id
    )
  );

CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() IN (
      SELECT user_id FROM public.conversation_members WHERE conversation_id = messages.conversation_id
    )
  );

CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() IN (
      SELECT user_id FROM public.conversation_members WHERE conversation_id = messages.conversation_id
    )
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
