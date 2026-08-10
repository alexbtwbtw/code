# Capacitor Spike — recipe (no code yet)

This directory is a placeholder. **It does not contain any Capacitor install.** It documents the exact steps a follow-up PR will take to wrap `game/frontend/` as an iOS + Android app. See `game/docs/MOBILE-DEPLOYMENT.md` for the full decision memo and rationale.

## Why no install here

Installing `@capacitor/ios` and `@capacitor/android` generates native project folders (`ios/`, `android/`) with thousands of files, writes to `package-lock.json`, and must be committed carefully. The research PR that added this directory was intentionally scoped to the decision memo + env-var refactor only. The PR that runs these commands is separate so it can be reviewed on its own.

## Recipe — follow-up PR

Run from `game/frontend/`, on a machine with Node 25, Xcode 16+, and Android Studio Koala+:

```bash
# 1. Install Capacitor into the existing frontend package
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/status-bar @capacitor/haptics @capacitor/app

# 2. Initialise Capacitor (answers below are suggestions)
npx cap init "Clicker Battle" com.clickerbattle.app --web-dir=dist
# This writes capacitor.config.ts — edit it so appId/appName match the final bundle IDs.

# 3. Build the web app and add native platforms
npm run build
npx cap add ios
npx cap add android

# 4. Sync native assets and open the native IDEs
npx cap sync
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

## capacitor.config.ts — expected shape

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.clickerbattle.app',
  appName: 'Clicker Battle',
  webDir: 'dist',
  server: {
    // In prod the bundled web build is served from the app; no remote URL.
    // For live-reload dev we point at the Vite server on the LAN:
    //   npx cap run ios --livereload --external
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#0b0d12',
  },
}

export default config
```

## Required env vars (set in `game/frontend/.env`)

```
VITE_BACKEND_HTTP_URL=https://clickerbattle.example.com/game
VITE_BACKEND_WS_URL=wss://clickerbattle.example.com/game/ws
```

These are baked into the built JS bundle at `npm run build` time; the mobile app ships with them frozen. The web build on S3 can continue to use the `window.location`-based fallback from `src/config.ts`.

## iOS native permissions & entitlements

- **App Transport Security:** no exception needed — we use `wss://` only.
- **`ITSAppUsesNonExemptEncryption`:** add `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `ios/App/App/Info.plist` to skip the export-compliance prompt each TestFlight build.
- **Privacy manifest (`PrivacyInfo.xcprivacy`):** Capacitor 7 generates one; add reason `CA92.1` for `UserDefaults` (app-state persistence).
- **Push notifications:** only if PR 3 (push) ships — add the Push Notifications capability in Xcode and an APNs key in App Store Connect.

## Android native permissions

- `INTERNET` — automatic.
- Nothing else for v1. Push would add `POST_NOTIFICATIONS` (Android 13+) and a Firebase `google-services.json`.

## Dev workflow

- `npm run dev` — unchanged; Vite on :5174 for browser development.
- `npx cap run ios --livereload --external` — WebView on an iOS sim/device pointed at your LAN Vite server; hot reload works.
- `npx cap run android --livereload --external` — same for Android.
- `npm run build && npx cap sync` — regenerate the native bundle when cutting a real build.

## CI notes

- Android builds run on any Linux runner. iOS builds require macOS (GitHub Actions `macos-14`).
- First TestFlight upload uses `fastlane pilot` or `xcodebuild -exportArchive` + `altool`.
- First Play internal-testing upload uses `bundletool` or `fastlane supply`.

## Out of scope for this spike

- Push notifications (separate PR, requires Firebase + APNs).
- In-app purchases (not applicable — no monetisation planned).
- Deep links (`clickerbattle://game/<uuid>`) — nice-to-have, separate PR.
