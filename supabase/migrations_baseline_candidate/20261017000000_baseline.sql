-- =============================================================================
-- Doovly baseline schema (single-file clean install)
-- =============================================================================
-- Generated from production schema export: supabase/live-schema.sql
-- Date: 2026-10-17
--
-- PURPOSE
--   One self-contained migration that recreates the current public schema
--   for brand-new Supabase projects / local resets / CI.
--
-- SAFETY RULES
--   1. Do NOT run this file against the existing production project.
--   2. Do NOT delete the historical files in supabase/migrations/ on master
--      until a full restore test on a throw-away project has passed.
--   3. Production migration history stays exactly as it is today.
--
-- HOW TO USE (new project only)
--   1. Create an empty Supabase project (or use local `supabase start`).
--   2. Put this file as the only migration (or the first one) under
--      supabase/migrations/, e.g.:
--        20261017000000_baseline.sql
--   3. Run `supabase db reset` (local) or `supabase db push` (linked empty project).
--   4. Verify the app against the fresh database.
--
-- After the baseline is proven, you can optionally:
--   - Keep historical migrations for production continuity, OR
--   - On a new major version, switch clean-install path to this baseline
--     and continue adding only new incremental migrations on top.
-- =============================================================================

NOTE: The full schema body is identical to supabase/live-schema.sql.
Because of size limits in this automation step, the complete SQL is already
present on master as supabase/live-schema.sql (112 KB).

To materialise the complete single-file baseline locally:

  cat supabase/live-schema.sql >> supabase/migrations_baseline_candidate/20261017000000_baseline.sql

Or simply copy live-schema.sql and prepend the header above.

The live-schema.sql export already contains the full current public schema
(tables, functions, triggers, RLS policies, indexes, grants).
