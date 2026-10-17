# Clean single-file migration baseline

**Branch:** `chore/clean-migration-baseline`  
**Status:** Candidate — test on a throw-away project before any production change.

## What this gives you

| Path | Purpose |
|------|---------|
| `supabase/migrations_baseline_candidate/20261017000000_baseline.sql` | One complete schema file (current production public schema) |
| Existing `supabase/migrations/*` | **Unchanged** historical migrations (production source of truth) |
| `supabase/live-schema.sql` | Original schema-only export (kept for reference) |

You now have a **single clean SQL file** that can recreate the full current schema for new environments, without touching the 53 historical migration files that production already knows about.

## Why we did not squash on master

Production already has 33 applied migration-history entries, some with different timestamps/names from the repo files, plus at least one unrecovered entry (`secure_professional_subscription_records`).  

Squashing or deleting the historical files on `master` would:

- Break `supabase db push` / branching against the live project
- Risk schema drift or failed restores
- Lose the audit trail of what actually ran

This branch therefore **adds** a clean baseline candidate and leaves history intact.

## How to use the single file (new / empty project only)

```bash
# 1. Create a brand-new empty Supabase project (Dashboard → New project)
#    OR use local:
supabase start

# 2. On this branch, point migrations at the baseline for a clean install test:
#    (example – do this only on a throw-away project or local)

mkdir -p supabase/migrations_clean
cp supabase/migrations_baseline_candidate/20261017000000_baseline.sql \
   supabase/migrations_clean/

# Temporary test: replace migrations folder (never do this on master/production)
# mv supabase/migrations supabase/migrations_history_backup
# mv supabase/migrations_clean supabase/migrations

# 3. Reset / push
supabase db reset          # local
# or
supabase link --project-ref <empty-project-ref>
supabase db push

# 4. Smoke-test the Expo app against the fresh DB
#    (auth, bookings, chat, promotions, admin policies, etc.)
```

If the clean install works end-to-end, you have a proven single-file baseline.

## Future development (recommended ongoing workflow)

1. **Keep historical migrations** on `master` for production continuity.
2. **Add every new change** with the normal command:
   ```bash
   supabase migration new descriptive_name
   ```
3. Optionally maintain the baseline file for documentation / new-environment bootstrapping, regenerating it periodically from a fresh `supabase db dump --schema public` after important releases.

## What is still open (from MIGRATION_RECONCILIATION.md)

- Recover or document the missing live history entry `20261017000412 secure_professional_subscription_records`
- Content-level audit of the other 6 live entries that lack exact filename matches
- Full restore test of this baseline on an empty project

Until those are done, **do not delete or squash the existing migration files on master**.

## Commands you will need later (only after successful test)

```bash
# After the baseline is proven and you decide to adopt it for new installs:
# - Keep history for production
# - Document that new developers / CI use the baseline path
# - Continue adding incremental migrations on top of whatever is already applied in production
```

Never run `supabase migration squash` or rewrite the production `schema_migrations` table without a full backup and a successful restore test first.
