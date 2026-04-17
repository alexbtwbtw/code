# Clicker Battle — Mobile Deployment Decision Memo

**Status:** Research, April 2026
**Author:** Engineering (research spike)
**Scope:** How to ship the existing `game/` app (React 19 + Vite frontend, Hono + ws backend on :3001) to iOS and Android.

---

## TL;DR

**Recommended path: Capacitor wrap of the existing React+Vite frontend, shipped to both stores, with the backend left almost entirely untouched.**

It's the smallest delta from what we have today (single-file `App.tsx`, WebSocket-driven game loop, tRPC leaderboard), it reuses 100% of the UI code, and it ships to the App Store and Play Store — which PWA on iOS cannot. React Native / Expo / Tauri Mobile all force a rewrite of the parts of the app that are actually the product (the click UI, the animated button, the per-mode visual effects).

As a pre-cursor, we should also ship a **PWA upgrade in the same milestone** — it costs a day, it unlocks Android "install to home screen" immediately, and it makes the Capacitor shell's offline and caching story materially better because the assets are already PWA-shaped.

---

## Codebase baseline — what exists today

Understanding what we'd port / rewrite requires a clear picture of the frontend:

- `game/frontend/src/App.tsx` — single file, ~990 lines, three views (`LobbyView`, `GameView`, `LeaderboardView`). All game rendering is DOM + CSS: absolutely-positioned `<button>` elements, `transform: translate`, CSS classes `hot-zone`, `bomb-btn`, `click-btn`, animated via `requestAnimationFrame`.
- `game/frontend/src/main.tsx` — React 19, TanStack Query provider, that's it.
- `game/frontend/src/trpc.ts` — tRPC client + TanStack Query integration.
- `game/frontend/vite.config.ts` — `base: '/game/'`, dev proxy routes `/game/ws` to the backend on `:3001`.
- `game/frontend/index.html` — no manifest, no service worker, no icons, no theme color.
- WebSocket URL derivation (`App.tsx:92-95`):
  ```ts
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/game/ws`
  ```
  This is the single assumption that every mobile path has to replace — there is no fixed backend URL baked in, the client reuses the page origin.
- Backend (`game/backend/src/server.ts`, `ws/index.ts`) — Hono on port 3001, ws WebSocket server attached to the same HTTP server, no TLS in the app (TLS is terminated by the reverse proxy / AWS). No cookies, no auth, no sessions — just an anonymous player ID issued by the server over WS.

The leaderboard (`scores.list`/`scores.add` via tRPC) is the only non-WS path, and it's a trivial read-then-write pattern.

---

## Path 1: PWA / Add-to-Home-Screen

### Delta from today
- Add `public/manifest.webmanifest` with `name`, `short_name`, `start_url: "/game/"`, `display: "standalone"`, `theme_color`, icons (192 / 512 px).
- Add a minimal service worker (vite-plugin-pwa) to cache `index.html`, JS, CSS, fonts.
- Add apple-touch-icon, a splash image, `<meta name="apple-mobile-web-app-capable">`, `<meta name="apple-mobile-web-app-status-bar-style">` in `index.html`.
- Ensure the viewport meta stays as `width=device-width, initial-scale=1.0` (already correct).

### What ports as-is
- 100%. It's literally the existing app with an `<link rel="manifest">` and a service worker.

### What must be rewritten
- Nothing for the game loop itself.
- The click UI should gain `touch-action: manipulation` and larger hit targets (already partially there via `btn-size-tiny/small/normal/large`); `user-select: none` on the arena.
- The moving-button modes use `requestAnimationFrame` — fine on mobile, but Safari throttles rAF aggressively when the app backgrounds, which **combines poorly with the 30-second timer**. We should send a WS "pause/resume" or treat backgrounding as abandonment.

### Offline
- Shell caches cleanly. The multiplayer loop is 100% online (WS to the backend) — there's no offline mode of the game itself, and it wouldn't make sense to build one.

### Push notifications
- iOS 16.4+ supports Web Push **only when installed to Home Screen**. In the EU, Apple [removed standalone PWA support under the DMA](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), so EU users get a Safari tab with no push at all.
- Android (Chrome) supports push in PWAs natively.
- We don't currently have a push server / VAPID keys / any notification use cases. Not worth building unless we add "your friend challenged you" notifications.

### App store reality
- **iOS:** A raw PWA cannot be listed on the App Store ([Apple rejects repackaged websites under 4.2](https://www.mobiloud.com/blog/progressive-web-apps-ios)). Users install via Safari → Share → Add to Home Screen, a flow <5% of users know about.
- **Android:** Play Store accepts PWAs via TWA (Trusted Web Activity) / Bubblewrap. Works today, reliable.

### Backend changes
- None beyond "already serve over HTTPS" (already true in prod).
- WS over cellular works fine; we already use `wss://` in prod.

### Dev loop
- Excellent. Same Vite dev server, hot reload, Chrome DevTools.

### Effort
- **1 day** for PWA polish (manifest, SW, icons, splash). **1 extra day** if we want Android TWA in the Play Store.

---

## Path 2: Capacitor wrap of the existing React+Vite app (**RECOMMENDED**)

Capacitor 7 (current as of 2026) wraps a web app in a native shell — `WKWebView` on iOS, Android System WebView on Android — with a JS↔native bridge for device APIs (push, haptics, status bar, deep links).

### Delta from today
- `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android` inside `game/frontend/`.
- `npx cap init "Clicker Battle" com.clickerbattle.app --web-dir=dist`.
- `npx cap add ios && npx cap add android` — this generates a native Xcode project and an Android Studio project as sibling dirs (`game/frontend/ios/`, `game/frontend/android/`).
- Add a build-time config (`.env`) that defines `VITE_BACKEND_WS_URL` — Capacitor serves the frontend from `capacitor://localhost` (iOS) or `https://localhost` (Android), so the existing "reuse window.location.host" trick does **not** work and must be replaced with a hardcoded prod URL.
- Register Capacitor plugins for push (APNs + FCM via Firebase) if we want notifications, plus `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/app` for "back button closes the app" on Android.

### What ports as-is
- `App.tsx`: 100%.
- `main.tsx`, `trpc.ts`, CSS: 100%.
- All the animated modes (moving button, gravity, ghost, hot zone, bombs): 100%.
- WebSocket code: 99% — only the URL derivation changes.
- tRPC leaderboard: 100% once the base URL is configurable.

### What must be rewritten
- `getWsUrl()` in `App.tsx:92-95` must read from `import.meta.env.VITE_BACKEND_WS_URL` (fallback to the current behaviour in browser builds).
- `game/frontend/src/trpc.ts` needs a matching `VITE_BACKEND_HTTP_URL` env var.
- Click latency: `onClick` on a WebView button has a 300ms default tap delay on old WebViews — modern Capacitor uses `touch-action: manipulation` via FastClick-equivalent, but we should verify the 20 clicks/sec rate limit is actually reachable on mid-range Android devices. Likely fine; worth spike-testing.
- Status bar colour + safe-area insets for notch devices — one CSS update to add `env(safe-area-inset-top)` padding on the game-header.

### App store gotchas

**iOS / App Store:**
- **Apple IAP (guideline 3.1.1):** not applicable — we have no purchases.
- **Rejection risk:** Apple rejects "apps that are just wrapped websites" (4.2). A Capacitor app with native plugins (push, haptics, deep links, status bar) passes this bar easily; a no-plugin Capacitor shell does not. We need at least push + haptics wired in before first submission.
- **Privacy manifest (`PrivacyInfo.xcprivacy`):** mandatory since 2024. Capacitor 7 ships one; we add reasons for `UserDefaults` access.
- **Encryption export:** we use TLS only, so `ITSAppUsesNonExemptEncryption = NO` in Info.plist.
- **Apple Developer Program:** $99/yr, plus ~1 week for account + certificates + provisioning profiles the first time.

**Google Play:**
- **Play Console:** one-time $25.
- **Target API level:** Play now requires targeting within 1 year of the latest Android API (API 35 in 2026). Capacitor 7 does this out of the box.
- **Data safety form:** we collect player name (voluntary) — easy to fill.

### Backend changes
- **TLS cert required.** iOS `WKWebView` + App Transport Security blocks plaintext `ws://` by default. We already deploy with TLS in prod, so no new infra — but the **dev loop** needs a tunnel (ngrok/cloudflared) or a self-signed cert installed on the device for simulator testing, because the app will connect to a non-`localhost` backend.
- **WS over cellular:** iOS aggressively kills WS sockets when the app backgrounds or loses focus for >30s. Our game is 30 seconds long — a player who switches apps mid-game will disconnect. Current `cleanup.ts` correctly treats that as `endGame(winnerId = opponent)`, which is the right behaviour. No change.
- **No new endpoints, no session state, no auth changes.** The WS protocol is already idempotent enough.

### Dev loop ergonomics
- Day-to-day: `npm run dev` in `game/frontend/` runs Vite as today; `npx cap run ios` / `npx cap run android` launches the native simulator pointing at the built bundle.
- Live reload during native dev: `npx cap run ios --livereload --external` points the WebView at the Vite dev server on your LAN. Works well.
- Requires **Xcode 16+ on macOS** and **Android Studio** installed locally. CI builds need a macOS runner for iOS (GitHub Actions `macos-14`, ~$0.08/min — adds maybe $10–30/mo).

### Effort
- **5–8 engineer-days to first TestFlight / Play internal testing build**, breakdown:
  - 1 day: Capacitor init, env-var refactor, PWA assets, icons, splash
  - 1 day: safe-area / touch CSS polish, backgrounding behaviour
  - 1 day: push notification plugin + server-side VAPID/APNs/FCM wiring (optional for v1)
  - 2 days: App Store Connect + Play Console setup, privacy manifest, screenshots, review submission
  - 1–2 days: review round-trip fixes (almost always needed)

---

## Path 3: React Native (share tRPC types with backend)

Rewrite the frontend in React Native. Share `AppRouter` type from `game/backend/` via the existing `@backend` tsconfig path convention (already used in COBA).

### What ports as-is
- `tRPC` types: yes. `@trpc/client` works in React Native.
- `@tanstack/react-query`: yes, works unchanged.
- Zod schemas and the `ServerMsg` / `GameState` TypeScript union: yes.
- The WebSocket **protocol** (messages, sequencing): yes.

### What must be rewritten
- **All of `App.tsx`.** No DOM. `<div>` → `<View>`, `<button>` → `<Pressable>`, CSS → StyleSheet objects or NativeWind. This is the single-file 990-line component.
- The moving button — rAF exists but the animation should use `react-native-reanimated` running on the UI thread; otherwise 60fps bouncing on JS thread is shaky.
- Gravity / ghost / hot zone / bombs — all re-implemented in Reanimated.
- Routing — no `window.history.pushState`. Use React Navigation or Expo Router.
- `getWsUrl()` → hardcoded prod URL via env (`react-native-config` or Expo's `EXPO_PUBLIC_*`).
- Leaderboard form uses `<input>` → `<TextInput>`, different keyboard handling.

### App store gotchas
- Same as Capacitor — no IAP needed, standard review.
- **Bigger IPA/APK** (30–50 MB vs 5–10 MB for Capacitor).
- First-time submission pain is identical.

### Backend changes
- None.
- WS over cellular: Same background-kill caveats as Capacitor — actually slightly worse because RN on iOS can suspend the JS thread even before the OS kills the socket.

### Dev loop
- Metro bundler + hot reload is good.
- But: we now maintain **two UIs** (web on S3 + native) that both need to stay in sync for every gameplay change. Every new game mode we add (and we just shipped 7 of them in the last PR) has to be built twice.

### Effort
- **15–25 engineer-days** to feature parity with today's web game. ~3× Capacitor.

---

## Path 4: Expo (managed React Native)

Expo SDK 55 (React 19.2, RN 0.83) is the modern way to do Path 3. Everything in Path 3 applies, plus:

### Pros over bare RN
- EAS Build: cloud builds without a local Mac — big win for CI.
- EAS Update: OTA updates for JS-only changes, bypassing the app stores for minor fixes.
- First-class tRPC + React Query support, documented and common.
- Expo Router gives us the `/game/<id>` / `/game/leaderboard` URL structure via file-based routing.

### Cons
- All the "rewrite the UI" costs of Path 3 still apply.
- A few native features (custom notification styling, some audio paths) require "dev builds" rather than the Expo Go sandbox.

### Effort
- **12–20 engineer-days** — slightly less than bare RN thanks to EAS and template tooling. Still ~2–3× Capacitor.

---

## Path 5: Tauri Mobile

Tauri 2.0 is shipped and mobile is stable but explicitly **not** the primary focus. The appeal is a tiny binary and a Rust-based native bridge.

### What ports as-is
- The frontend JS bundle, same as Capacitor.

### What must be rewritten
- Any native plugin we need (push, haptics, background handling) either uses an official Tauri mobile plugin (barcode, biometric, geolocation, NFC are available; push is not fully first-class) or we write Swift/Kotlin ourselves via Tauri's mobile plugin API.

### Dev loop
- Requires **Rust toolchain**, Xcode, and Android Studio. New build step (Cargo) for anyone touching the shell.
- We have zero Rust in this monorepo. Adding it solely for mobile packaging is a high tax.

### App store gotchas
- Same as Capacitor.

### Effort
- **8–12 engineer-days** — more than Capacitor because the plugin ecosystem is thinner and we have no Rust muscle memory on the team.

### Verdict
- Not worth it unless we already had Rust in the stack.

---

## Comparison table

| Path | Effort (days) | Code reuse | iOS App Store | Play Store | Net-new toolchain | Maintains two UIs? |
|------|---------------|------------|---------------|------------|-------------------|---------------------|
| PWA  | 1–2           | 100%       | No            | Yes (TWA)  | None              | No |
| **Capacitor** | **5–8** | **~99%** | **Yes**    | **Yes**    | **Xcode + Android Studio** | **No** |
| RN (bare)     | 15–25 | ~30% (types only) | Yes | Yes | Xcode + Android Studio + Metro | **Yes** |
| Expo          | 12–20 | ~30% (types only) | Yes | Yes | Xcode + AS + EAS | **Yes** |
| Tauri Mobile  | 8–12  | ~95%       | Yes           | Yes        | Xcode + AS + **Rust**       | No |

---

## Recommendation

**Capacitor (Path 2), with a Path 1 PWA upgrade included in the same sprint.**

Rationale:
1. The product *is* the single-file `App.tsx` UI. Any path that rewrites it triples our effort and doubles our maintenance surface.
2. The backend needs essentially no changes — we already serve over TLS and already handle disconnect-as-loss.
3. Capacitor is the only path that ships to both stores without a rewrite.
4. The PWA upgrade is a 1-day freebie that makes the Capacitor bundle tighter (service worker asset caching) and also gives us Android/desktop "install" prompts in the browser.

Risks we're accepting (top 3):
- **Backgrounded WS sockets drop mid-game** on iOS. Mitigation: the server already treats disconnects as forfeits. We add a pre-game "stay in the app for 30s" warning banner.
- **App Store review rejection for "repackaged website."** Mitigation: ship with push + haptics + status-bar + safe-area handling so the app is demonstrably native.
- **Dev-loop complexity for non-Mac developers** (iOS build requires macOS). Mitigation: use EAS-style cloud builds via GitHub Actions `macos-14` runners, or accept that iOS builds happen only on the designer/tech-lead's Mac.

---

## Concrete first PR — file-level plan

**Branch:** `feature/mobile-capacitor-spike`
**Title:** "Capacitor spike: add PWA manifest and env-var WS URL"
**Ships:** nothing user-visible on web; sets up everything so a follow-up PR can `npx cap add ios` and build.

### Files created
- `game/frontend/public/manifest.webmanifest` — manifest with `start_url: "/game/"`, `display: "standalone"`, `theme_color: "#0b0d12"`, 192+512 icons.
- `game/frontend/public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (designer asset, size placeholders in the PR).
- `game/frontend/src/config.ts` — new module:
  ```ts
  export const BACKEND_WS_URL =
    import.meta.env.VITE_BACKEND_WS_URL ??
    (typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/game/ws`
      : 'ws://localhost:3001/ws')

  export const BACKEND_HTTP_URL =
    import.meta.env.VITE_BACKEND_HTTP_URL ??
    (typeof window !== 'undefined' ? `${window.location.origin}/game` : 'http://localhost:3001')
  ```
- `game/frontend/.env.example` — documents `VITE_BACKEND_WS_URL`, `VITE_BACKEND_HTTP_URL`.
- `game/capacitor-spike/README.md` — documents the planned `npx cap init`/`npx cap add ios|android` commands, the `capacitor.config.ts` shape, required native permissions, and the expected dev workflow. No code, just a recipe the next PR follows.
- `game/docs/MOBILE-DEPLOYMENT.md` — this memo.

### Files edited
- `game/frontend/index.html` — add `<link rel="manifest" href="/game/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/game/icons/apple-touch-icon.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `<meta name="theme-color" content="#0b0d12">`.
- `game/frontend/src/App.tsx` — replace `getWsUrl()` (lines 92–95) with `import { BACKEND_WS_URL } from './config'` and return that.
- `game/frontend/src/trpc.ts` — replace hardcoded/relative tRPC URL with `BACKEND_HTTP_URL` from `./config`.
- `game/frontend/vite.config.ts` — add vite-plugin-pwa with `registerType: 'autoUpdate'` and runtime-cache exclusion for `/game/ws` and `/game/trpc/*`.
- `game/frontend/package.json` — add `vite-plugin-pwa` devDep.

### Not in this PR (follow-up PRs)
- PR 2: `npx cap init` + `npx cap add ios/android`, commit the generated `ios/` and `android/` folders, add `npm run cap:sync` script.
- PR 3: push notifications (requires Firebase project + APNs key).
- PR 4: first TestFlight and Play internal track builds via CI.

---

## Open questions for the team

1. Do we need push for v1, or is "your friend challenged you" fine as a Lobby-visible event only?
2. Who owns Apple Developer + Play Console accounts? $99/yr + $25 one-time.
3. Is anyone on the team on Windows/Linux only? If yes, iOS CI-only workflow needs to be documented.
4. Anonymous player names today — does the App Store care? (No IAP, no accounts, no children's data collection → Apple generally does not care, but confirming.)

---

## Sources

- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Do Progressive Web Apps Work on iOS? 2026 — MobiLoud](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Tauri 2.0 Stable Release — tauri.app](https://v2.tauri.app/blog/tauri-20/)
- [Tauri Mobile Plugin Development — tauri.app](https://v2.tauri.app/develop/plugins/develop-mobile/)
- [Capacitor WebSocket community plugins — GitHub mia-z/capacitor-websocket](https://github.com/mia-z/capacitor-websocket)
- [Capacitor Core APIs — capacitorjs.com](https://capacitorjs.com/docs/core-apis/web)
- [Expo + tRPC example (Turborepo) — GitHub gunnnnii/turbo-expo-trpc-starter](https://github.com/gunnnnii/turbo-expo-trpc-starter)
- [Awesome tRPC — trpc.io](https://trpc.io/awesome)
