# Mock ↔ DB parity (API swap ready)

This document lists how `src/data/*` mocks map to Supabase after migration `001_schema.sql` and `seed.sql`.

## Apply

```bash
supabase db reset
# or: apply migrations then seed.sql in SQL editor
```

Seed auth users password: **`password123`**

## Coverage matrix

| Mock source | DB tables | Seeded | `mock_id` |
|---|---|---|---|
| `professionals.ts` | `professionals`, `services`, `reviews`, `portfolio_items` | Yes | pro `1`–`6`, services `s1`… |
| `booking.ts` | `bookings` | Yes | `b1`–`b3`, `r1`–`r3` |
| `serviceRequests.ts` | `service_requests`, `service_request_comments`, `service_request_offers` | Yes | `1`–`7`, `11` |
| `notifications.ts` | `notifications` | Yes | `n1`–`n9` |
| `savedProviders.ts` | `saved_providers` | Yes (u1 → pro 1,2) | — |
| `serviceCategories.ts` | `service_categories` | Yes | slug ids |
| `subscriptionPlans.ts` | `subscription_plans`, `subscription_plan_features`, `subscription_plan_meta` | Yes | `basic`, `pro` |
| `subscriptions.ts` | `professional_subscriptions` | Yes | `sub-1`…`sub-6` |
| `verificationApplications.ts` | `verification_applications`, `verification_documents` | Yes | `va-1`… |
| `adminNotifications.ts` | `admin_notifications` | Yes | `n1`…`n6` |
| `chat.ts` | `conversations`, `messages`, `conversation_reads` | Yes | `c1`–`c4` |
| `adminUsers.ts` / dashboard | derived from pros + above | — | use views/queries |

## ID helpers

- `src/lib/ids.ts` — `toUuid` / `toMockId` / `MOCK_SESSION`
- `src/lib/mappers.ts` — booking/verification/subscription status casing + image key → local asset

## Image convention

- Seed stores `mock://profile_N.jpg` or `image_key = profile_N`
- UI still uses `require("@/assets/profile_N.jpg")` via `resolveImageSource`
- On Cloudinary upload, write HTTPS `image_url` / `avatar_url` / `images[]` and stop using mock keys

## Status casing

| Domain | DB | App mock |
|---|---|---|
| Booking | `pending` / `accepted` / `declined` | `Pending` / `Accepted` / `Declined` |
| Verification | `pending` / `verified` / `rejected` | `Pending` / `Verified` / `Rejected` |
| Subscription | `active` / `expired` / `cancelled` + plan `free`/`pro` | Title case + `Free`/`Pro` |

Use mappers in services when swapping.

## Swap order (recommended)

1. Auth session (`supabase.auth` + `MOCK_SESSION` replacement)
2. Professionals + services + reviews + portfolio
3. Bookings
4. Service requests + comments + offers
5. Notifications + saved providers
6. Chat (realtime channel)
7. Subscriptions + verification + admin

Keep **function names** in `src/services/*`; only replace function bodies.
