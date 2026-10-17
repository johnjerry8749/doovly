-- Admin-managed Pro access must override a still-active RevenueCat entitlement.
-- This is an access override only; it does not cancel the user's store subscription.
ALTER TABLE public.professional_subscriptions
  ADD COLUMN IF NOT EXISTS admin_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_admin_override
  ON public.professional_subscriptions (user_id, updated_at DESC)
  WHERE admin_override = TRUE;

-- Profile-level overrides also cover accounts that do not have a professional profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_access_override BOOLEAN,
  ADD COLUMN IF NOT EXISTS pro_access_override_updated_at TIMESTAMPTZ;
