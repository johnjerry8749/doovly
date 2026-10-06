-- Add a catch-all service/profession category for new and unlisted professions.
INSERT INTO public.service_categories (mock_id, name, icon, sort_order)
SELECT
  'other',
  'Other',
  'briefcase-outline',
  COALESCE((SELECT MAX(sort_order) FROM public.service_categories), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories WHERE LOWER(TRIM(name)) = 'other'
);
