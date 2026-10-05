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
