-- Protect private profile columns without removing the public profile fields used by
-- professional cards and profile discovery. App access to private profile fields is
-- routed through narrowly scoped, identity-checked RPCs.
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  full_name,
  avatar_url,
  city,
  profession,
  created_at,
  member_since,
  is_online,
  last_active_label
) ON TABLE public.profiles TO anon, authenticated;

-- A signed-in user can retrieve only their own private profile fields.
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'phone', p.phone,
    'role', p.role,
    'pro_trial_ends_at', p.pro_trial_ends_at,
    'pro_access_override', p.pro_access_override,
    'pro_access_override_updated_at', p.pro_access_override_updated_at
  )
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

-- Admin user management retains access through an explicit admin-only RPC.
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  role text,
  city text,
  is_suspended boolean,
  member_since timestamptz,
  created_at timestamptz,
  last_active_label text,
  last_active_at timestamptz,
  pro_access_override boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Administrator access required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.phone,
    p.email,
    p.avatar_url,
    p.role,
    p.city,
    p.is_suspended,
    p.member_since,
    p.created_at,
    p.last_active_label,
    p.last_active_at,
    p.pro_access_override
  FROM public.profiles AS p
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- Chat may read a participant's contact details only when the caller is that
-- participant or shares an existing conversation with them.
CREATE OR REPLACE FUNCTION public.get_chat_participant_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result jsonb;
  caller_id uuid := (SELECT auth.uid());
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS DISTINCT FROM caller_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.conversations AS c
       WHERE (c.participant_a = caller_id AND c.participant_b = p_user_id)
          OR (c.participant_b = caller_id AND c.participant_a = p_user_id)
     ) THEN
    RAISE EXCEPTION 'Chat participant access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'phone', p.phone,
    'role', p.role
  )
  INTO result
  FROM public.profiles AS p
  WHERE p.id = p_user_id
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_participant_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_participant_profile(uuid) TO authenticated;
