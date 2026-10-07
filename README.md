# Kendibo App (Expo SDK 57, TypeScript)

## Env vars

| Var | Used by | Notes |
| --- | ------- | ----- |
| `EXPO_PUBLIC_API_URL` | `src/services/api.ts` (`baseUrl()`) | Overrides `app.json` `extra.apiUrl` in `__DEV__`. See `.env.example`. |

- Copy `.env.example` to `.env` for local work.
- Production default: `https://kendibo-page.pxxlspace.cv`.
- Local dev: `http://YOUR_PC_IP:3001` (find via `ipconfig`; `localhost` is unreachable from physical devices; Android emulator can use `http://10.0.2.2:3000` via `app.json` `extra.apiUrl`).
- Verified installed (do not reinstall): `expo-secure-store` (`~57.0.4`, in `app.json` plugins) and `react-native-maps` (`1.27.2`).

## EAS build

`eas.json` profiles (verified):

- `development` — `developmentClient: true`, `distribution: internal`, Android `apk`. For dev builds with native modules.
- `preview` — `distribution: internal`, Android `apk`. For internal QA.
- `production` — Android `app-bundle`. For Play Store (`eas submit --platform android`).

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile production --platform android
```

Needs human action: `eas login`, and `extra.eas.projectId` is not yet set in `app.json` — run `npx eas-cli@latest init` / `eas project:init` and wire the ID (push token fetch passes it to `getExpoPushTokenAsync` when present).

## FCM / google-services.json (Android push)

- Firebase console → create project → Add Android app, package `com.kendibo.app` → download `google-services.json` into `kendibo-app/google-services.json` (same folder as `app.json`).
- `app.json` already contains `android.googleServicesFile: ./google-services.json`. No new reference was added — the file itself is intentionally NOT committed (gitignored / private repo only, never public). Without it, release builds fail at `processReleaseGoogleServices` and push tokens are null; dev/Expo Go still runs because `src/services/push.ts` no-ops to `null`.
- `src/services/push.ts` `registerForPushAsync()` only logs the token and persists it in `expo-secure-store` key `kendibo_push_token` — there is no backend push endpoint yet, so nothing is uploaded.

## Google Maps API key (react-native-maps, Android)

- `app.json` currently has NO `android.config.googleMaps.apiKey` block — intentional. No placeholder key was added to `app.json` and no real key is ever committed.
- To enable Google basemap tiles on Android, add (locally or via EAS secrets, never commit the real value):
  ```json
  {
    "expo": {
      "android": {
        "config": {
          "googleMaps": { "apiKey": "YOUR_GOOGLE_MAPS_KEY" }
        }
      }
    }
  }
  ```
- `src/app/tracking/map/[id].tsx` uses `PROVIDER_GOOGLE`, `initialRegion` Uyo `5.0377, 7.9128` (deltas `0.05/0.05`), provider `Marker` + completed/remaining `Polyline` driven by the existing timer/progress state. Without an API key it still renders (or falls back) in dev; production needs the key + billing-enabled Cloud project.

## Dev build vs Expo Go

- Expo Go: `expo-notifications` is lazy-required (`require` in `try/catch`, same pattern as `src/services/permissions.ts`) so it never crashes — `registerForPushAsync()` just logs and returns `null`. Push tokens REQUIRE a dev build (FCM native module + `google-services.json`).
- After adding/using native libs (`react-native-maps`, `expo-notifications`), run a dev build: `npx expo run:android` locally or `eas build --profile development`. Then `npx expo start --dev-client`.
- `src/app/_layout.tsx` calls `registerForPushAsync()` fire-and-forget alongside `requestAll()`; fonts/splash logic untouched.
