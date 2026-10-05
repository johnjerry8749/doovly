# Mock → Supabase migration

## What changed (no CSS / layout edits)

Only **service layer** + thin data-load effects in a few screens.

### New files
- `src/lib/rowMappers.ts` — DB rows → app types (same shapes UI expects)
- `src/lib/bootstrapData.ts` — loads caches once at app start

### Rewritten services (same export names)
- `src/services/professionals.ts`
- `src/services/bookings.ts`
- `src/services/savedProviders.ts`
- `src/services/inAppNotifications.ts`
- `src/services/serviceRequests.ts`

### Screen data refresh only (no StyleSheet changes)
- `src/app/_layout.tsx` — calls `bootstrapAppData()`
- `src/app/(tab)/home.tsx`
- `src/app/(tab)/services.tsx`
- `src/app/(tab)/bookings.tsx`
- `src/app/(tab)/requests.tsx`

### Still on mock (same as before)
- `src/services/chat.ts` — large in-memory chat; swap next using realtime
- Admin services, subscriptionPlans, profile.ts (where still mock)

## How to run

1. Copy `.env.example` → `.env` with real Supabase URL + anon key
2. `supabase db reset` (applies migrations + seed; password `password123`)
3. `npx expo start`

## Design

- **Sync exports** kept so existing screens do not break
- **In-memory cache** filled from Supabase on bootstrap
- **Mutations** update cache immediately and write to Supabase in background
- **mock_id** preferred as public id so routes like `/professional/1` still work
