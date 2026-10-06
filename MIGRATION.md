# Doovly Supabase migration status

Doovly now uses Supabase as the runtime data source for customer-facing data. The legacy mock-data and mock-ID compatibility layer is being removed on the `cleanup/remove-mock-system` branch.

## Current architecture

- Authentication and sessions use Supabase Auth.
- Professionals, services, reviews and portfolio data come from Supabase.
- Cities and service categories come from Supabase.
- Bookings, service requests, offers, comments and likes use Supabase.
- Notifications and chat use Supabase.
- Cloudinary is used for user/request/portfolio images.
- Application IDs are real UUIDs; no mock-ID translation is used by the app.
- New normal user accounts do not automatically create a professional row.

## Cleanup changes

- Removed the legacy `src/data/*` mock runtime modules.
- Removed the mock ID map and compatibility helpers.
- Removed the unused mock notification service.
- Removed the repository seed data.
- Added a migration to remove legacy `mock_id` columns after replacing the signup trigger.
- Request filters now load categories and cities from Supabase.

## Validation before merging

1. Run the Supabase migrations on a preview/staging branch.
2. Verify sign-up creates a profile but does not create a professional unless the account is explicitly professional.
3. Verify Home, Services, Requests, Bookings, Saved Professionals and Chat using UUIDs only.
4. Verify notifications and Cloudinary uploads.
5. Run the TypeScript/Expo build and real-device smoke tests.

No production database changes are made by this Git branch alone.
