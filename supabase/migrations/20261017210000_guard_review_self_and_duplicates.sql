-- Enforce one review per authenticated user per professional and prohibit self-reviews.
-- Keep the existing review display schema and UI unchanged.

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_user_per_professional
  ON public.reviews (professional_id, user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated can insert own review"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND user_id = (SELECT auth.uid())
  );

CREATE OR REPLACE FUNCTION public.guard_review_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  professional_owner uuid;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You must submit a review using your own signed-in account.'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.user_id
    INTO professional_owner
  FROM public.professionals AS p
  WHERE p.id = NEW.professional_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professional not found.'
      USING ERRCODE = '23503';
  END IF;

  IF professional_owner = auth.uid() THEN
    RAISE EXCEPTION 'You cannot review your own professional profile.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_review_submission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_review_submission ON public.reviews;
CREATE TRIGGER guard_review_submission
  BEFORE INSERT OR UPDATE OF professional_id, user_id
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_review_submission();
