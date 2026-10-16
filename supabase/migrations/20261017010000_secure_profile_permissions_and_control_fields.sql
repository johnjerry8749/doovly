-- Tighten profile permissions without changing the app's existing authenticated profile reads.
-- Public/anonymous clients can read only fields intended for public display and cannot mutate profiles.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, city, profession, created_at, member_since, is_online, last_active_label)
  ON TABLE public.profiles TO anon;

-- Do not allow a logged-in user to elevate privileges or alter account/trial control fields
-- through the ordinary profile update endpoint. Admin workflows remain supported.
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

DROP TRIGGER IF EXISTS guard_profile_control_fields ON public.profiles;
CREATE TRIGGER guard_profile_control_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_control_fields();

REVOKE ALL ON FUNCTION public.guard_profile_control_fields() FROM PUBLIC, anon, authenticated;
