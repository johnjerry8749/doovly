# Doovly Supabase migration status map

**Audit date:** 2026-10-17  
**Repository:** `johnjerry8749/doovly`, branch `master`  
**Supabase project:** `csxgbafziesqpvjiygzy`

## Decision

This is a completed inventory/reconciliation audit, **not permission to delete or squash migrations yet**. The current production database and its migration history were read only. No production SQL or migration-history rows were changed.

- Repository: 53 SQL files in `supabase/migrations/`.
- Remote history: 33 applied versions.
- 26 repository files have a corresponding remote migration name (3 timestamps already match; 23 timestamps differ).
- 27 repository files have no exact remote migration-name match (including `001_schema.sql`).
- 7 remote history entries have no matching standalone source file in the repository.
- Two files contain byte-identical SQL but map to two different remote history entries.

A file's similar name is not proof that its SQL is identical to what production originally ran. Keep the old files until their effects and a clean-install replay have been verified.

## Repository file → remote migration mapping

The filename timestamps below are the repository timestamps; the versions after the arrow are the versions recorded in Supabase. Matching versions by name is a candidate mapping, not proof of matching SQL.

| Repository file | Remote version | Remote migration name | Timestamp status |
| --- | --- | --- | --- |
| `20261005193000_optimize_auth_rls_policies.sql` | `20261005190228` | `optimize_auth_rls_policies` | Mismatch |
| `20261005193300_reduce_duplicate_permissive_policies.sql` | `20261005190421` | `reduce_duplicate_permissive_policies` | Mismatch |
| `20261005193500_optimize_remaining_update_rls.sql` | `20261005190719` | `optimize_remaining_update_rls` | Mismatch |
| `20261005201000_add_verification_submission_policies.sql` | `20261005202141` | `add_verification_submission_policies` | Mismatch |
| `20261005202000_protect_admin_profile_controls.sql` | `20261005204148` | `protect_admin_profile_controls` | Mismatch |
| `20261005202100_allow_admin_subscription_management.sql` | `20261005204244` | `allow_admin_subscription_management` | Mismatch |
| `20261005210200_allow_admin_professional_subscription_state.sql` | `20261005210448` | `allow_admin_professional_subscription_state` | Mismatch |
| `20261005212000_enable_professionals_realtime.sql` | `20261005211513` | `enable_professionals_realtime` | Mismatch |
| `20261005213000_link_subscription_plan_codes.sql` | `20261005212808` | `link_subscription_plan_codes` | Mismatch |
| `20261005213100_allow_admin_subscription_plan_inserts.sql` | `20261005212856` | `allow_admin_subscription_plan_inserts` | Mismatch |
| `20261006120000_chat_coins_pro_images_calls_location_rules.sql` | `20261006101144` | `chat_coins_pro_images_calls_location_rules` | Mismatch |
| `20261006121500_chat_system_message_kind.sql` | `20261006101451` | `chat_system_message_kind` | Mismatch |
| `20261006154000_fix_booking_conversation_conflict_target.sql` | `20261006112947` | `fix_booking_conversation_conflict_target` | Mismatch |
| `20261006170000_reuse_accepted_person_conversations.sql` | `20261006114539` | `reuse_accepted_person_conversations` | Mismatch |
| `20261006190000_add_chat_delete_and_block.sql` | `20261006181709` | `add_chat_delete_and_block` | Mismatch |
| `20261007190000_add_thirty_day_pro_trial.sql` | `20261007195048` | `add_thirty_day_pro_trial` | Mismatch |
| `20261008001000_add_verification_submission_notifications.sql` | `20261007233233` | `add_verification_submission_notifications` | Mismatch |
| `20261008003000_fix_service_request_like_uniqueness.sql` | `20261008000358` | `fix_service_request_like_uniqueness` | Mismatch |
| `20261008160000_service_promotions.sql` | `20261008145021` | `service_promotions` | Mismatch |
| `20261016190000_promotion_analytics_tracking.sql` | `20261016214728` | `promotion_analytics_tracking` | Mismatch |
| `20261016200000_expire_promotions_and_notify_results.sql` | `20261016213618` | `expire_promotions_and_notify_results` | Mismatch |
| `20261016201000_fix_expired_promotion_status.sql` | `20261016213704` | `fix_expired_promotion_status` | Mismatch |
| `20261017010000_secure_profile_permissions_and_control_fields.sql` | `20261016232008` | `secure_profile_permissions_and_control_fields` | Mismatch |
| `20261006143230_one_chat_thread_per_user_pair.sql` | `20261006143230` | `one_chat_thread_per_user_pair` | Exact timestamp |
| `20261007235327_prevent_duplicate_service_request_offers.sql` | `20261007235327` | `prevent_duplicate_service_request_offers` | Exact timestamp |
| `20261016230846_secure_service_promotion_payment_fields.sql` | `20261016230846` | `secure_service_promotion_payment_fields` | Exact timestamp |

## Remote history entries without a matching standalone repository file

| Remote version | Remote migration name | Status |
| --- | --- | --- |
| `20261003195238` | `create_professional_for_every_profile_v2` | Source not recovered |
| `20261003205240` | `create_profile_images_storage` | Source not recovered |
| `20261005190017` | `notification_triggers_for_bookings_and_offers` | Source not recovered |
| `20261005190318` | `configure_production_subscription_plans_v2` | Source not recovered |
| `20261005190515` | `harden_functions_and_foreign_key_indexes` | Source not recovered |
| `20261006113326` | `prevent_duplicate_active_bookings` | Source not recovered |
| `20261017000412` | `secure_professional_subscription_records` | Source not recovered |

The live schema can show the present-day result of a migration, but cannot establish the exact historical SQL. In particular, do not invent a migration and describe it as the original `secure_professional_subscription_records` source.

## Repository files not represented by an exact remote migration name

These files remain in place because their changes may be necessary to rebuild a clean database, or may be included in a later remote migration. The audit has not proven them redundant.

- `001_schema.sql` — current bootstrap schema, but incomplete compared with live schema.
- `20261005173000_fix_professional_and_service_write_policies.sql`
- `20261005190000_harden_admin_notification_policies.sql`
- `20261005193100_notification_triggers.sql`
- `20261005193200_configure_production_subscription_plans.sql`
- `20261005193400_harden_functions_and_fk_indexes.sql`
- `20261005195000_comment_edit_delete_policies.sql`
- `20261005200000_fix_service_category_icons.sql`
- `20261005203000_allow_delete_own_request_comments.sql`
- `20261006001000_add_welcome_notification_on_signup.sql`
- `20261006002000_enable_notification_realtime.sql`
- `20261006003000_allow_users_to_delete_notifications.sql`
- `20261006004000_add_other_service_category.sql`
- `20261006004100_default_profession_to_other.sql`
- `20261006040000_add_expo_push_notifications.sql`
- `20261006123000_fix_new_account_professional_profiles.sql`
- `20261006130000_booking_conversation_trigger.sql`
- `20261006140000_booking_chat_data_and_location_lock.sql`
- `20261006143000_prevent_duplicate_booking_and_offer_chat.sql`
- `20261006150000_monthly_free_chat_coins.sql`
- `20261006152000_fix_booking_conversation_unique_conflict.sql`
- `20261006180000_remove_legacy_mock_id_system.sql`
- `20261008004000_fix_conversation_reads_rls.sql`
- `20261008010000_sync_service_request_like_counts.sql`
- `20261008012000_realtime_service_request_like_counts.sql`
- `20261008170000_configure_promotion_packages.sql`
- `20261008171000_index_service_promotion_package.sql`

## Duplicate SQL requiring correction

These two files have the same Git blob SHA and identical 5,015-byte contents:

- `20261016200000_expire_promotions_and_notify_results.sql`
- `20261016201000_fix_expired_promotion_status.sql`

They correspond to separate remote versions and separate names. The second file should not be silently deleted or treated as a distinct fix until its intended SQL is recovered or its redundancy is proven. The migration names alone do not establish what production ran.

## Current-schema drift

The committed `supabase/live-schema.sql` is a schema-only export of the live database; it contains no table data. It is a reference artifact, not yet a verified clean-install migration. Compared with `001_schema.sql`, the live schema has 30 public tables rather than 25 and includes these tables missing from the baseline:

- `chat_credits`
- `promotion_packages`
- `service_promotions`
- `service_promotion_analytics`
- `service_promotion_events`

There are also live-only columns on `profiles`, `bookings`, `notifications`, `subscription_plans`, `subscription_plan_features`, `verification_applications`, `conversations`, and `messages`. The live `password_reset_rate_limits` table differs from the baseline in column names (`email_hash`/`attempts` versus `key_hash`/`request_count`). Full DDL/security equivalence must be tested, not inferred from table counts alone.

## Safe next steps before deleting or replacing migration files

1. Take a restorable backup of production and retain a copy of the 33-entry remote history.
2. Recover the seven missing migration SQL files from trusted Git history or the original author/source. Do not synthesize historical migrations from their names.
3. Audit the 27 repository-only files for effects not present in the live schema and decide which are required for a fresh install.
4. Correct the duplicate expired-promotion migration using trusted source SQL.
5. Build a proposed fresh-install baseline in a separate branch/project from the live schema plus required storage bucket/configuration. Validate RLS, grants, policies, functions, triggers, indexes, extensions, constraints, and app smoke tests from an empty database.
6. Keep production migration history untouched during that test. Supabase compares migration versions (timestamps) between local files and remote history, and `migration repair` changes that history; neither should be used as a cosmetic cleanup.
7. Only after a successful clean-install test, choose and document a baseline/squash cutover strategy. New feature work should then be delivered as a newly generated, timestamped migration using `supabase migration new <name>`, tested locally, committed, and deployed through the normal migration workflow.

## What this audit changed

Only this documentation manifest and its link from `MIGRATION_RECONCILIATION.md` are intended changes. No SQL migration file is deleted, renamed, or applied, and no production data or migration history is modified.
