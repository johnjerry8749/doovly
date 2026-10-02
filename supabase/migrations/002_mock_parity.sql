-- ============================================================
-- Doovly – Mock parity schema (100% ready for mock → API swap)
-- Adds everything missing from 001 vs src/data/* + chat service
-- ============================================================

-- ------------------------------------------------------------
-- MOCK ID + EMAIL columns (stable string ids used by app mocks)
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS mock_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS mock_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS mock_id TEXT;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS mock_id TEXT,
  ADD COLUMN IF NOT EXISTS display_date TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS mock_id TEXT UNIQUE,
  -- Keep DB status lowercase; app maps Pending/Accepted/Declined
  ADD COLUMN IF NOT EXISTS display_date TEXT,
  ADD COLUMN IF NOT EXISTS professional_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS professional_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS mock_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS time_ago TEXT,
  ADD COLUMN IF NOT EXISTS image_keys TEXT[] DEFAULT '{}';

ALTER TABLE public.service_request_comments
  ADD COLUMN IF NOT EXISTS mock_id TEXT,
  ADD COLUMN IF NOT EXISTS time_ago TEXT;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS mock_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS time_label TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_mock
  ON public.services (professional_id, mock_id)
  WHERE mock_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_mock
  ON public.reviews (professional_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- SERVICE CATEGORIES (src/data/serviceCategories.ts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id     TEXT UNIQUE,
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'briefcase-outline',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PORTFOLIO (Professional.portfolio)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id         TEXT,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  description     TEXT NOT NULL DEFAULT '',
  -- Cloudinary URL later; seed uses mock://profile_N.jpg keys
  image_url       TEXT,
  image_key       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_professional
  ON public.portfolio_items (professional_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_mock
  ON public.portfolio_items (professional_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- CHAT (src/services/chat.ts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id         TEXT UNIQUE,
  -- For 1:1 chat the two participants (user profile ids)
  participant_a   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Optional link to booking / service request
  booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  last_message    TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_distinct_participants CHECK (participant_a <> participant_b)
);

CREATE INDEX IF NOT EXISTS idx_conversations_a ON public.conversations (participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_b ON public.conversations (participant_b);

CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id         TEXT,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text            TEXT NOT NULL DEFAULT '',
  kind            TEXT NOT NULL DEFAULT 'text'
                  CHECK (kind IN ('text', 'location', 'location_stopped', 'request_card')),
  location_label  TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  -- request_card payload (json for booking/offer cards)
  card            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages (conversation_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_mock
  ON public.messages (conversation_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- SUBSCRIPTION PLANS (src/data/subscriptionPlans.ts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id             TEXT UNIQUE NOT NULL, -- 'basic' | 'pro'
  name                TEXT NOT NULL,
  tagline             TEXT NOT NULL DEFAULT '',
  monthly_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  yearly_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  popular             BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_plan_features (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id     TEXT,
  plan_id     UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_features_mock
  ON public.subscription_plan_features (plan_id, mock_id)
  WHERE mock_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.subscription_plan_meta (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_title          TEXT NOT NULL DEFAULT '',
  promo_subtitle       TEXT NOT NULL DEFAULT '',
  yearly_save_percent  INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PROFESSIONAL SUBSCRIPTIONS (src/data/subscriptions.ts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id           TEXT UNIQUE,
  professional_id   UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  plan_id           UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_code         TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan_code IN ('free', 'pro')),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'cancelled')),
  status_label      TEXT,
  start_date        DATE,
  end_date          DATE,
  -- RevenueCat / store ids later
  revenuecat_app_user_id TEXT,
  store_product_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_subs_professional
  ON public.professional_subscriptions (professional_id);

-- ------------------------------------------------------------
-- VERIFICATION APPLICATIONS (src/data/verificationApplications.ts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id           TEXT UNIQUE,
  professional_id   UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_on      DATE,
  email             TEXT,
  phone             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_apps_pro
  ON public.verification_applications (professional_id);

CREATE TABLE IF NOT EXISTS public.verification_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id           TEXT,
  application_id    UUID NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  doc_type          TEXT NOT NULL DEFAULT 'other'
                    CHECK (doc_type IN ('pdf', 'image', 'other')),
  uploaded          BOOLEAN NOT NULL DEFAULT FALSE,
  -- Cloudinary URL later; seed uses mock image keys
  file_url          TEXT,
  preview_key       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_docs_mock
  ON public.verification_documents (application_id, mock_id)
  WHERE mock_id IS NOT NULL;

-- ------------------------------------------------------------
-- ADMIN NOTIFICATIONS (src/data/adminNotifications.ts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id         TEXT UNIQUE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  channels        TEXT[] NOT NULL DEFAULT '{}',
  sent_to         TEXT NOT NULL DEFAULT 'all'
                  CHECK (sent_to IN ('all', 'verified', 'subscribed', 'free')),
  sent_to_label   TEXT NOT NULL DEFAULT 'All Users',
  status          TEXT NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent', 'scheduled', 'failed')),
  link            TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- SERVICE REQUEST OFFERS (offersCount / offeredByUserIds)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_request_offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mock_id         TEXT,
  request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2),
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sr_offers_request
  ON public.service_request_offers (request_id);

-- ------------------------------------------------------------
-- UPDATED_AT triggers for new tables
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS professional_subscriptions_updated_at ON public.professional_subscriptions;
CREATE TRIGGER professional_subscriptions_updated_at
  BEFORE UPDATE ON public.professional_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS verification_applications_updated_at ON public.verification_applications;
CREATE TRIGGER verification_applications_updated_at
  BEFORE UPDATE ON public.verification_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- RLS for new tables
-- ------------------------------------------------------------
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_offers ENABLE ROW LEVEL SECURITY;

-- Public read catalogs
CREATE POLICY "Public can view service categories"
  ON public.service_categories FOR SELECT USING (true);

CREATE POLICY "Public can view portfolio"
  ON public.portfolio_items FOR SELECT USING (true);

CREATE POLICY "Public can view subscription plans"
  ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Public can view plan features"
  ON public.subscription_plan_features FOR SELECT USING (true);

CREATE POLICY "Public can view plan meta"
  ON public.subscription_plan_meta FOR SELECT USING (true);

-- Chat: participants only
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users can insert conversations they join"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
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

CREATE POLICY "Users manage own conversation reads"
  ON public.conversation_reads FOR ALL
  USING (auth.uid() = user_id);

-- Subscriptions: own professional row readable by owner; public plan status on pro is already on professionals.subscribed
CREATE POLICY "Public can view professional subscriptions"
  ON public.professional_subscriptions FOR SELECT USING (true);

CREATE POLICY "Owners can view own verification apps"
  ON public.verification_applications FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.professionals WHERE id = professional_id
    )
  );

CREATE POLICY "Public can view verified application status only is via professionals"
  ON public.verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.verification_applications va
      JOIN public.professionals p ON p.id = va.professional_id
      WHERE va.id = application_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert offers"
  ON public.service_request_offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view offers count via parent; users see own offers"
  ON public.service_request_offers FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Admin notifications: read for authenticated (tighten to admin later)
CREATE POLICY "Authenticated can view admin notification history"
  ON public.admin_notifications FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pro owners can manage portfolio
CREATE POLICY "Pros can insert own portfolio"
  ON public.portfolio_items FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.professionals WHERE id = professional_id
    )
  );

CREATE POLICY "Pros can update own portfolio"
  ON public.portfolio_items FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.professionals WHERE id = professional_id
    )
  );

CREATE POLICY "Pros can delete own portfolio"
  ON public.portfolio_items FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.professionals WHERE id = professional_id
    )
  );

-- ------------------------------------------------------------
-- API-friendly view: professional row shaped like mock Professional
-- ------------------------------------------------------------
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

-- Booking status helper comment:
-- DB stores: pending | accepted | declined | completed | cancelled
-- App mock uses: Pending | Accepted | Declined
-- Map in src/lib/mappers.ts when swapping services.

-- ------------------------------------------------------------
-- Auto-create profile on auth signup (API swap ready)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, mock_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'mock_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
