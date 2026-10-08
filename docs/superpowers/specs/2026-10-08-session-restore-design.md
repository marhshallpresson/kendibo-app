# Session Restore, PIN Gate & Fingerprint (Design)

Date: 2026-10-08 · App: kendibo-app · Status: approved

## Problem

Reloading the app (web) or restarting it (native) always lands on onboarding.
Investigated root causes:

1. `authStore.hydrate()` (`src/stores/authStore.ts:297`) is never called from
   anywhere — no restore path runs on boot.
2. `hasCompletedOnboarding`, `pin` and `isBiometricEnabled` are never
   persisted; they reset to defaults on every load.
3. `expo-secure-store` throws on web, so access/refresh tokens were
   memory-only — a web reload wiped the session entirely.
4. `src/app/(auth)/splash.tsx` routes after a fixed 2s timer against state that
   is still `false` at mount, so it always chose onboarding.

## Approach (approved)

Boot-time `bootstrap()` with persisted auth state. One restore path; redirects
become pure functions of restored state. No per-route guards, no backend
cookie session.

## Design

### Storage adapter — `src/services/storage.ts`

`getItem(key)`, `setItem(key, value)`, `removeItem(key)`.

- Native: `expo-secure-store` (keystore/keychain).
- Web: `@react-native-async-storage/async-storage` (localStorage-backed),
  which is already installed.

Used by both `services/api/client.ts` (`readToken`, refresh rotation) and
`stores/authStore.ts`, so web sessions survive reload.

### Persisted keys

| Key | Content |
| --- | --- |
| `kendibo_access` | JWT access token |
| `kendibo_refresh` | refresh token (rotation) |
| `kendibo_user` | cached `User` |
| `kendibo_onboarding` | `'1'` once onboarding was completed |
| `kendibo_pin` | device-local 4-digit PIN (never sent to the backend) |
| `kendibo_biometrics` | `'1'` when the user enabled fingerprint |

### Bootstrap (`hydrate()`)

Runs exactly once from `RootLayout`:

1. Read persisted flags synchronously → set `hasCompletedOnboarding`, `pin`,
   `isBiometricEnabled` immediately, so onboarding cannot flash.
2. `GET /v1/me`. The client already auto-refreshes once on 401; only when the
   refresh itself fails do we clear the persisted session.
3. Set `user`, `token`, `isAuthenticated: true`.
4. **If `isAuthenticated && pin` → `isLocked: true`** → lock screen.
5. Always set `hydrated: true` (success, offline-with-cache, or cleared).

Offline: keep the last-known cached user (existing behaviour) and start locked.

### Boot gate

- New store flag `hydrated`.
- `RootLayout` renders nothing (splash stays visible) until `hydrated`.
- `splash.tsx` and `index.tsx` stop using a 2s timer and route off `hydrated`:
  - authenticated → `/(tabs)` or `/(provider)` (lock screen overlays if locked)
  - `hasCompletedOnboarding` → `/(auth)/login`
  - otherwise → `/(auth)/onboarding`
- Session invalid after refresh → cleared → login, **never** onboarding.

### Lock screen (`components/PinLockScreen.tsx`)

- On mount, auto-prompt `expo-local-authentication`
  (`authenticateAsync` with `biometric` fallback) when `isBiometricEnabled`.
  Success unlocks; dismiss/failure falls back to the keypad (no re-prompt loop).
- Keypad behaviour unchanged: 4 digits auto-unlock, wrong PIN shakes the error.
- **"Logout instead" → "Forgot Pin?"**: an in-overlay flow, because the lock
  screen is a full-screen overlay above the router stack:
  1. *Identify* — choose SMS/Email, enter the account's phone or email,
     `POST /v1/auth/otp/request`.
  2. *Code* — 6-box OTP entry with countdown, resend and channel switch,
     `POST /v1/auth/otp/verify` (re-issues the session for that account).
  3. *New PIN* — enter + confirm 4 digits → `setPin()` → `unlockApp()`.
- Logout is still reachable from Settings; the overlay only offers recovery.

## Error handling

- `/v1/me` 401 + refresh failure → clear session, go to login.
- Network down at boot → cached user, locked; API calls surface the existing
  NetworkBanner.
- Biometric unavailable/denied → keypad, silently.
- OTP failures → inline message with retry; user can go back a step.

## Testing

- `npx tsc --noEmit` and `npx expo lint` clean.
- Manual matrix: native restart, web reload, expired refresh token, account
  with no PIN, biometric denied, forgot-PIN happy path, forgot-PIN wrong code.
