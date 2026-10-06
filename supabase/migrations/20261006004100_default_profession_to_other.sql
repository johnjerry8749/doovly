-- Store a default profession on every user profile without creating a professional listing.
-- New registrations receive Other automatically; Edit Profile updates this field.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profession TEXT NOT NULL DEFAULT 'Other';

UPDATE public.profiles
SET profession = 'Other'
WHERE profession IS NULL OR BTRIM(profession) = '';
