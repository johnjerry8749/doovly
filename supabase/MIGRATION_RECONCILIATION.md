# Supabase migration reconciliation

**Status: inventory and mapping audit complete; destructive cleanup is not yet safe. Do not delete or squash migration files yet.**

See [`MIGRATION_STATUS_MAP.md`](./MIGRATION_STATUS_MAP.md) for the complete 53-file ↔ 33-entry mapping, all timestamp mismatches, remote-only entries, repository-only files, and the safe cutover checklist. This audit changed documentation only; production SQL and migration history remain untouched.

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

These are live catalog observations, not a full `pg_dump` and not proof that a replacement baseline will replay successfully. The CLI export initially failed, but a subsequent export succeeded and is now committed as `supabase/live-schema.sql`. This is a schema-only export (no table data statements were found during a text check). No schema-changing SQL was run, no migration history was altered, and no production rows were changed during this inspection.

The missing live history entry `20261017000412 secure_professional_subscription_records` remains unresolved as a source-file recovery task. Current live policy inspection shows an `Admins can manage professional subscriptions` policy on `professional_subscriptions`, but that observation alone is not enough to reconstruct the original migration exactly.

## Live schema inventory checked directly through Supabase

Read-only catalog queries against the linked live project confirmed the following inventory on 2026-10-17:

- 30 base tables in `public`.
- 1 view in `public`: `v_professionals_app`.
- 75 row-level security policies across 28 public tables.
- 23 functions in `public`.
- 20 non-internal triggers in `public`.
- Installed extensions observed: `pg_cron`, `pg_graphql`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`.

The 30 public tables are: `admin_notifications`, `bookings`, `chat_credits`, `cities`, `conversation_reads`, `conversations`, `messages`, `notifications`, `password_reset_rate_limits`, `portfolio_items`, `professional_subscriptions`, `professionals`, `profiles`, `promotion_packages`, `reviews`, `saved_providers`, `service_categories`, `service_promotion_analytics`, `service_promotion_events`, `service_promotions`, `service_request_comments`, `service_request_likes`, `service_request_offers`, `service_requests`, `services`, `subscription_plan_features`, `subscription_plan_meta`, `subscription_plans`, `verification_applications`, and `verification_documents`.

This inventory was collected with read-only queries and did not modify production. It is useful for reconciliation, but **it is not a complete schema export**: exact table DDL, all constraints and indexes, function bodies, policies, triggers, grants, storage configuration, and other managed schemas still need to be captured and validated before calling any single file a reproducible baseline.

### Additional evidence for the missing subscription-security migration

A read-only inspection of the live `public.professional_subscriptions` table confirms these current security/schema facts:

- RLS is enabled, with one policy: `Admins can manage professional subscriptions`, for `authenticated`, using `is_admin()` and checking `is_admin()`.
- The table references `professionals(id)` with `ON DELETE CASCADE`, `profiles(id)` with `ON DELETE CASCADE`, and `subscription_plans(id)` with `ON DELETE SET NULL`.
- Check constraints currently restrict `plan_code` to `free` or `pro`, and `status` to `active`, `expired`, or `cancelled`.
- The table has indexes on `professional_id`, `plan_id`, and `user_id`, plus its primary-key and unique-`mock_id` indexes.
- The `professional_subscriptions_updated_at` trigger calls `set_updated_at()`.

This records the current end state, not the original SQL or exact historical intent of the missing migration. Do not recreate a migration from this evidence alone or mark it as historically recovered.

### Follow-up verification: missing subscription-security migration

- Searched the repository's current files and GitHub commit history for the exact name `secure_professional_subscription_records`; no source file or historical commit with that filename was found.
- The live migration history entry therefore remains unrecovered. The current live table's state is documented above, but that state does not establish the missing migration's original SQL.
- Live table grants currently show `authenticated` has table-level `SELECT`, `INSERT`, and `UPDATE`; `service_role` has all table privileges except none are grantable onward; the `postgres` owner has the owner-level privileges. RLS is enabled and not forced.
- The only current RLS policy found on `professional_subscriptions` is `Admins can manage professional subscriptions` for `authenticated`, with both `USING (is_admin())` and `WITH CHECK (is_admin())`. There is no current non-admin read policy on this table.
- The live `is_admin()` function is marked SECURITY DEFINER with `search_path=public`; `set_updated_at()` is not SECURITY DEFINER and also has `search_path=public`.

These are read-only observations of the live end state. No production grants, policies, tables, or migration history were changed during this check.

## Baseline drift check against live table columns (2026-10-17)

A read-only comparison of `supabase/migrations/001_schema.sql` with the live `public` table catalog found that this file is **not a complete current baseline**:

- The file defines 25 tables; the live project has 30 public tables.
- Entirely absent from `001_schema.sql`: `chat_credits`, `promotion_packages`, `service_promotions`, `service_promotion_analytics`, and `service_promotion_events`.
- Live columns not represented in the baseline were found in:
  - `profiles`: `expo_push_token`, `profession`, `pro_trial_started_at`, `pro_trial_ends_at`
  - `bookings`: `source_offer_id`, `service_id`, `promotion_id`
  - `notifications`: `request_id`, `data`
  - `subscription_plans`: `code`
  - `subscription_plan_features`: `code`
  - `verification_applications`: `submitted_at`, `admin_notified_at`
  - `conversations`: `offer_id`, `text_allowed`, `text_allowed_by`, `text_allowed_at`, `blocked_by`, `blocked_at`
  - `messages`: `image_url`
- `password_reset_rate_limits` has schema drift in both directions: live has `email_hash` and `attempts`, while the baseline instead defines `key_hash` and `request_count`.

The comparison above is a column-presence check only. It does not establish matching types, defaults, generated expressions, constraints, indexes, RLS, grants, function bodies, triggers, views, extensions, or storage policies. It is evidence that `001_schema.sql` must not be used by itself as a current replacement schema. No production data or schema was changed.


## Successful live-schema export reviewed on GitHub (2026-10-17)

The schema export is now present on the `master` branch at [`supabase/live-schema.sql`](./live-schema.sql) (112,963 characters at review time). A text-level comparison against `supabase/migrations/001_schema.sql` confirms the original baseline is incomplete:

- Export contains 30 public tables; `001_schema.sql` defines 25.
- The five additional tables are `chat_credits`, `promotion_packages`, `service_promotions`, `service_promotion_analytics`, and `service_promotion_events`.
- The export contains 23 public functions and the view `v_professionals_app`.
- The baseline defines only 5 of the live function names. The later migration files account for some, but the repository must be replay-tested as a sequence before claiming it fully recreates the export.
- The export includes RLS enablement, policies, indexes, constraints, grants, and trigger definitions. A text scan did not find `INSERT INTO` or `COPY` data-load statements, so this should be treated as schema export, not a data backup.

This is a structural/text comparison, not a successful clean-database restore test. It does not prove that the export is independently replayable in every Supabase environment; managed schemas, roles, extensions, ownership, and Supabase-specific dependencies may need environment-aware handling.

## Recommended consolidation decision

Do not rewrite or delete the 53 existing migration files on `master` yet. Keep them as historical source until all 33 live migration-history entries have been reconciled. For a clean-install path, prepare a separate candidate baseline from the exported schema, review it for managed-role/extension assumptions and security settings, then test it on a separate empty Supabase project. Keep production migration history unchanged; do not mark migrations applied or reset production to make the repository appear consistent.


## Migration-history filename audit (2026-10-17)

Compared all 33 live migration-history entries with the 53 filenames under `supabase/migrations/`. Twenty-six live entries have a repository file with the same normalized migration name. Seven live entries do not have an exact name match:

| Live migration-history entry | Finding |
| --- | --- |
| `20261003195238 create_professional_for_every_profile_v2` | No exact-name repository file |
| `20261003205240 create_profile_images_storage` | No exact-name repository file |
| `20261005190017 notification_triggers_for_bookings_and_offers` | No exact-name repository file |
| `20261005190318 configure_production_subscription_plans_v2` | No exact-name repository file |
| `20261005190515 harden_functions_and_foreign_key_indexes` | No exact-name repository file |
| `20261006113326 prevent_duplicate_active_bookings` | No exact-name repository file |
| `20261017000412 secure_professional_subscription_records` | No exact-name repository file |

“ No exact-name repository file” does not prove the SQL is absent from the repository: a later file or the original baseline may contain equivalent statements. Each entry needs a content-level search and schema-effect comparison before classifying it as missing. Conversely, a filename match is not proof that its SQL is identical to the version applied in production.

There are also repository migration files with no exact-name match in the live history. This can be caused by renaming, migration history changes, a statement being included in another migration, or a file that was never applied. Do not automatically apply, delete, or mark these files as applied based on names alone.

The next safe step is a content-level audit of the unmatched entries and then a clean-project replay test of a candidate baseline. Production remains unchanged.
