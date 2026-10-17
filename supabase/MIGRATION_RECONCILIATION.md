# Supabase migration reconciliation

**Status: reconciliation in progress — do not delete or squash migration files yet.**

## Current verified state

- Supabase project: `csxgbafziesqpvjiygzy`
- Branch reviewed: `master`
- Repository contains 53 SQL files under `supabase/migrations/`.
- Supabase records 33 applied migration-history entries.
- `supabase/CONSOLIDATED_MIGRATIONS.sql` is a cleaned reference archive of the 53 repository files. It is **not** a runnable migration and must not be pasted into production as one SQL migration.
- Production data exists. Do not reset the project or rewrite migration history as part of cleanup.

## Known discrepancies to resolve

Migration names may correspond while their timestamps differ. Examples confirmed from the current repository and live migration history:

| Repository file | Live migration history entry |
| --- | --- |
| `20261008160000_service_promotions.sql` | `20261008145021 service_promotions` |
| `20261016190000_promotion_analytics_tracking.sql` | `20261016214728 promotion_analytics_tracking` |
| `20261016200000_expire_promotions_and_notify_results.sql` | `20261016213618 expire_promotions_and_notify_results` |
| `20261016201000_fix_expired_promotion_status.sql` | `20261016213704 fix_expired_promotion_status` |
| `20261017010000_secure_profile_permissions_and_control_fields.sql` | `20261016232008 secure_profile_permissions_and_control_fields` |

The live history also contains `20261017000412 secure_professional_subscription_records`, for which no matching standalone file was identified in the repository inventory. This must be recovered from a trusted source or documented from the live database before claiming the repository is a complete migration source of truth.

Two repository files were previously identified as byte-for-byte duplicates:
- `20261016200000_expire_promotions_and_notify_results.sql`
- `20261016201000_fix_expired_promotion_status.sql`

Even if two files have identical contents, their distinct names and their relationship to recorded production history must be resolved before either file is removed.

## Safe completion procedure

1. Back up the live database and record the current migration history.
2. Compare every repository migration against the live history and the actual schema (tables, columns, indexes, constraints, functions, triggers, RLS policies, grants, extensions, and storage configuration).
3. Recover and review the missing `secure_professional_subscription_records` migration from a trusted source; do not invent its SQL from its name.
4. Decide on a documented baseline/squash strategy only after the comparison is complete. Test it on a separate Supabase project restored from backup.
5. Keep the current migration files and production history unchanged until the test restore and app smoke tests pass. Do not mark migrations as applied or delete history entries just to make timestamps match.

## Validation note

The consolidated archive was checked after cleanup: it contains 53 source-file headers, retains its archive-only warning, and has no Git merge-conflict markers. This validates the archive text, **not** that all SQL has been replay-tested or that the live schema is fully reproducible from the repository.

## Live schema inspection (2026-10-17)

A read-only inspection was performed directly against the linked Supabase project after the local CLI dump failed. The live project currently reports:

- 30 base tables in `public`, with row-level security enabled on the inspected tables.
- 75 policies in `public`.
- 23 functions in `public`.
- 21 triggers in `public`.
- 112 indexes in `public`.
- Installed extensions: `pg_cron`, `pg_graphql`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`.
- Storage bucket observed: `profile-images` (public).

These are live catalog observations, not a full `pg_dump` and not proof that a replacement baseline will replay successfully. The local CLI export failed before producing a verified dump. No schema-changing SQL was run, no migration history was altered, and no production rows were changed during this inspection.

The missing live history entry `20261017000412 secure_professional_subscription_records` remains unresolved as a source-file recovery task. Current live policy inspection shows an `Admins can manage professional subscriptions` policy on `professional_subscriptions`, but that observation alone is not enough to reconstruct the original migration exactly.
