#!/usr/bin/env bash
# Generate a single-file clean-install baseline from the current live-schema export.
# Usage:
#   ./scripts/generate-baseline-migration.sh
# Output:
#   supabase/migrations_baseline_candidate/20261017000000_baseline.sql

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/supabase/live-schema.sql"
OUT_DIR="$ROOT/supabase/migrations_baseline_candidate"
OUT="$OUT_DIR/20261017000000_baseline.sql"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: $SRC not found. Run a schema export first." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

cat > "$OUT" << 'HEADER'
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
--   2. Put this file as the only migration under supabase/migrations/.
--   3. Run `supabase db reset` (local) or `supabase db push` (empty project).
--   4. Verify the app against the fresh database.
-- =============================================================================

HEADER

cat "$SRC" >> "$OUT"

echo "Wrote $OUT ($(wc -c < "$OUT") bytes)"
echo "This file is for clean installs only. Keep supabase/migrations/ history intact for production."
