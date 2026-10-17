-- Prevent ordinary authenticated users from changing Pro-access overrides directly.
-- Admin subscription workflows remain available through public.is_admin().
CREATE OR REPLACE FUNCTION public.guard_profile_control_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.pro_trial_started_at IS DISTINCT FROM OLD.pro_trial_started_at
       OR NEW.pro_trial_ends_at IS DISTINCT FROM OLD.pro_trial_ends_at
       OR NEW.pro_access_override IS DISTINCT FROM OLD.pro_access_override
       OR NEW.pro_access_override_updated_at IS DISTINCT FROM OLD.pro_access_override_updated_at
       OR NEW.mock_id IS DISTINCT FROM OLD.mock_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.member_since IS DISTINCT FROM OLD.member_since THEN
      RAISE EXCEPTION 'Profile account-control fields can only be changed by an administrator'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_control_fields() FROM PUBLIC, anon, authenticated;
