# Mock → Supabase (production-oriented path)

## Done (service layer only — no CSS / layout)

### 1. Real auth
- `src/lib/session.ts` — `loadSessionUser`, no mock fallbacks
- Services use session or return empty / guest when signed out
- `AuthContext` clears session cache on sign-out

### 2. Data loading / error / offline
- `src/lib/dataState.ts` — `idle | loading | ready | error | offline`
- `bootstrapAppData()` sets phase, retries via `retryBootstrap()`
- Subscribe with `subscribeDataState` (no UI required)

### 3. Services on Supabase
- professionals, bookings, savedProviders, notifications, serviceRequests
- In-memory cache + same function names for screens

### 4. Chat + realtime
- `src/services/chat.ts` loads conversations/messages from DB
- `bindChatRealtime()` listens to `messages` INSERT
- Same exports (listConversations, sendMessage, acceptBooking, …)

### 5. Bootstrap
- Loads session → all caches → binds auth + chat realtime

## Run
1. `.env` with Supabase URL + anon key
2. `supabase db reset` (seed password `password123`)
3. Sign in with a seed user (do not rely on mock session)
4. `npx expo start`

## Still not production-final
- Hardening: retries, full RLS audit, E2E tests
- Some booking/offer chat flows still optimistically local then persist
- Screen loading indicators optional (use `getDataState()` if desired)
