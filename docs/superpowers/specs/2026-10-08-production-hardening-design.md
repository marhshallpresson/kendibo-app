# KENDIBO Production Hardening — Design Spec

**Date:** 2026-10-08
**Status:** Approved (A/A/A)
**Scope:** `kendibo-backend` + `kendibo-app`

## Goal

Make KENDIBO production-quality: real Bachs payments end-to-end, zero demo/mock/hardcoded data, real address management, per-service category icons, home navigation that matches the Urban Company reference flow.

## Decisions (approved)

1. **Special Offers banners: REMOVE entirely.** No offers backend exists; fake 30/25/40% claims are demo data. Re-add later against a real `/v1/promos` endpoint (out of scope).
2. **Payments: Bachs-only on the client.** Remove Paystack/Mastercard methods and dummy card/PIN from the app. Client shows one method: "Pay with Bachs". Flutterwave adapter stays in the backend, dormant, for a future server-side fallback — never surfaced in the UI. No Mastercard anywhere.
3. **On-demand flow: rework to "Tell us what you need" → quote request.** User picks a category, describes the job, adds photos, picks a time window, submits a quote request. Pro responds with a price; user accepts to convert to a booking. Replaces hardcoded dummy service list.

## Approach

Vertical slices, backend-first. Each slice is independently verifiable (backend: `npm run build` + tests; app: `npx tsc --noEmit` + `npx expo lint`).

Rejected: big-bang rewrite (high regression risk); app-only first (blocked by missing backend endpoints).

---

## Slice 1 — Backend gaps

### 1a. `/v1/config/flags`
App calls `GET /v1/config/flags` and gets 404. Backend already returns `flags` inside `GET /v1/config`. Add a thin route `GET /v1/config/flags` returning `{ data: await configurationService.flags() }` so the existing app call succeeds. (Keep `/v1/config` unchanged.)

### 1b. Address CRUD
Backend has `GET /v1/addresses` and `POST /v1/addresses` only. Add:
- `PATCH /v1/addresses/:id` — update label/street/city/state/lat/lng/landmark/phone
- `DELETE /v1/addresses/:id` — soft or hard delete (match existing propertyService semantics)
- `POST /v1/addresses/:id/default` — set as default address for the user (clear previous default, set new one in a transaction)

All authed, all scoped to `a.sub`. Add corresponding `propertyService` methods.

### 1c. Category `iconName`
Categories table has no `icon_name` — app falls back to Sparkles for every category.
- Migration `014_category_icon_name.sql`: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_name text;` then seed per-category names matching the app's `getCategoryIcon` switch: Cleaning→`Sparkles`, Plumbing→`Wrench`, Electrical→`Zap`, AC Repair→`Wind`, Painting→`Paintbrush`, Carpentry→`Hammer`, Appliance→`Tv`, others→`Sparkles`. (Adjust the app switch to also accept `Hammer`.)
- `catalogService.categories()` must select and return `iconName`.
- Apply migration manually via `npm run db:migrate` (deploys do not run SQL).

### 1d. Webhook hardening (`payment.service.handleWebhook`)
- Dedupe BEFORE signature verification (idempotent on event id).
- `chargeId` resolution: `charge_id ?? payment_id ?? id`.
- Amount cross-check: webhook amount must match the stored payment amount; mismatch → reject, do not mark paid.
- Return 404 for unknown payment/charge (not 500).
- `bachs.adapter`: add `toVerified()` and `verifyByReference()` helpers for server-side verification of a charge before trusting a webhook.
- `main.ts` webhook route: wrap in try/catch so a thrown error returns 500 JSON, never crashes the process; add structured logging for WatchUp callbacks (currently silent).
- Parse `wt_` prefixed userIds correctly (strip prefix, treat remainder as the internal id).

### 1e. Pentest expectations
Update `scripts/pentest-payments.ts` to cover: amount mismatch rejection, unknown-charge 404, replay/dedupe, signature failure.

---

## Slice 2 — App mock-data purge

Delete/replace every hardcoded value. File:line references from audit:

- `src/stores/locationStore.ts:16-38` — delete `defaultUyoAddress` and its seeding of `currentAddress`/`savedAddresses`. On first run, `currentAddress` is null; app must route to address-add flow.
- Address string fallbacks — remove `'addr_uyo_01'` / `'addr-uyo-default'` fallbacks; require a real `addressId`:
  - `payment/checkout.tsx:152,234`
  - `service/[id].tsx:188`
  - `booking/schedule.tsx:137`
  - `booking/quote-review.tsx:114-116`
  - `booking/quote-request.tsx:163`
  - `booking/cart.tsx:164-166,209`
  - `booking/add-location.tsx:19-25` (NY default '267 New Avenue Park') — remove
  - `(tabs)/index.tsx:135` — no 'Uyo' string fallback
  - `receipt/[id].tsx:135`
- `payment/checkout.tsx` — remove `PAYMENT_METHODS` with Mastercard, dummy card '4679', default PIN '1234', fallback cart `baseKobo 2700000`, "Live booking failed, falling back to dummy" catch.
- `(tabs)/profile.tsx:129` — Mastercard alert text
- `booking/cancel/[id].tsx:210` — "Mastercard" refund text → "card/bank"
- `settings/index.tsx:267` — payment text
- `stores/walletStore.ts:78` — 'Mastercard •••• 4242' → real or remove
- `service/reviews/[id].tsx:49` — demo reviews → fetch real reviews or empty state
- `(tabs)/index.tsx:49-66` — delete `PROMO_BANNERS` and the Special Offers section (Decision 1)
- `booking/on-demand/1-service.tsx` and siblings — hardcoded dummy services (reworked in Slice 6)

After purge: no string "Mastercard", no `'addr_uyo_01'`, no `'addr-uyo-default'`, no dummy PIN, no fake promo percentages anywhere in `src/`.

## Slice 3 — Real Bachs-only checkout

`payment/checkout.tsx` rework:
- One payment method UI: "Pay with Bachs" (no method picker, no card form, no PIN).
- Flow: select address (must exist) → `POST /v1/bookings` (real sync booking) → `POST /v1/bookings/:id/payments` with `{ provider: 'bachs', amountKobo }` → get Bachs checkout reference/redirect → poll or deep-link back → on success navigate to `receipt/[id]`; on failure show error and allow retry.
- Remove the entire dummy-booking fallback. If booking creation fails, show the error, do not proceed to a fake success.
- Amounts always from the real quote (`totalKobo`), never hardcoded.

## Slice 4 — Home rework

`(tabs)/index.tsx`:
- Per-category icon: `getCategoryIcon` renders from `category.iconName` (add `Hammer` case). Tint order unchanged.
- Bell → `/notifications` (create minimal screen if absent: list of in-app notifications, empty state).
- Bookmark → `/saved` (create minimal screen: bookmarked services from local bookmark store, empty state).
- Address line → tap opens address manager (Slice 5). No `'Uyo'` fallback.
- Category tap already → `/service/category/:id` ✓ keep.
- Remove Special Offers carousel (done in Slice 2).
- Popular list: stop firing authenticated `GET /v1/bookings` while browsing (Slice 7).

## Slice 5 — Address management

New/updated screens under `booking/` (or `profile/`):
- **Address list** — `GET /v1/addresses`, show each with default badge, tap to select as current, edit/delete actions.
- **Add address** — reuse/extend `booking/add-location.tsx`: label, street, city, state, landmark, phone, lat/lng (map pin or "use current location"), then `POST /v1/addresses`.
- **Edit address** — `PATCH /v1/addresses/:id`.
- **Set default** — `POST /v1/addresses/:id/default`.
- **Delete** — `DELETE /v1/addresses/:id`, confirm dialog, block deleting the last address.
- Current address persisted in `locationStore` (zustand + storage), always an id reference into the server list — never a fabricated object.
- If no addresses exist, booking entry points route to add-address instead of failing.

## Slice 6 — On-demand flow rework

Replace `booking/on-demand/*` dummy-service screens with:
1. **Category select** — real categories from `GET /v1/categories`.
2. **Describe the job** — free-text description + optional photo attachments.
3. **Time window** — pick a preferred date/time range.
4. **Review & submit** — `POST /v1/quotes` (or the existing quote-request endpoint) with `{ categoryId, description, photoUrls, addressId, preferredWindow }`.
5. **Quote received** — pro's price shown; Accept → creates booking (`POST /v1/bookings` with quote id) and proceeds to checkout (Slice 3); Decline → back to home.

Remove the hardcoded dummy service list from `1-service.tsx`.

## Slice 7 — Auth hygiene

- Gate all booking/quote/payment queries on presence of a token: skip the query (or return empty) when logged out instead of firing 401s. Use the existing `authed`/token state in the query hooks.
- `app.json`: add `notification.vapidPublicKey` (from env/Expo push keys) to fix `registerForPushAsync failed`.
- Ensure `GET /v1/bookings/live_booking_6655` 403 handling surfaces a friendly message, not a crash.

---

## Verification (per slice and at the end)

- Backend: `npm run build` (tsc must stay clean for Pxxl deploy) + `./node_modules/.bin/tsx --test --test-force-exit tests/*.test.ts`
- App: `npx tsc --noEmit` + `npx expo lint`
- Post-implementation grep: no `Mastercard`, no `addr_uyo_01`, no `addr-uyo-default`, no `1234` PIN default, no `PROMO_BANNERS`, no `defaultUyoAddress` in `kendibo-app/src/`.
- Apply DB migrations manually (`npm run db:migrate`) — deploys do not run SQL.

## Out of scope

- Real promo/offers backend (`/v1/promos`)
- Flutterwave removal (kept dormant server-side)
- Paystack (never present)
- `kendibo-page` (excluded)
- APK build
