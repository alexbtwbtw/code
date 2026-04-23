# Clicker Battle — Android (Capacitor) Deployment Plan

**Status:** Research, April 2026
**Author:** Engineering (research spike, follow-up to [`MOBILE-DEPLOYMENT.md`](./MOBILE-DEPLOYMENT.md))
**Scope:** Exactly how we ship `game/` to **Android** as a Capacitor 7 app, keeping the existing web deploy (S3 + reverse proxy) **unchanged**, and making **solo** and the (upcoming) **local 2-player** modes work **fully offline**.
**Out of scope:** iOS (documented as a later extension), online multiplayer offline support (stays online-only), monetisation / IAP, push.

---

## 0. TL;DR

- Native project lives at `game/android/` (sibling of `frontend/` and `backend/`). `capacitor.config.ts` lives at `game/capacitor.config.ts`. `webDir` points at `frontend/dist`.
- The web build is unchanged. Android reuses the exact same `npm --prefix frontend run build` output; no second bundle, no second Vite config.
- Offline strategy: a thin `scoresRepo` abstraction in `game/frontend/src/` that routes to **tRPC (web)** or **local SQLite via `@capacitor-community/sqlite` (Android)**. A tiny `isNative()` helper gates the switch. Online MP is simply hidden/disabled when `!navigator.onLine`.
- Root `npm run dev`, the reverse proxy, `coba/`, and `home/` are **not touched**.
- First ship is an **internal testing track** AAB uploaded manually; CI that builds an APK on tag is proposed but not merged as a workflow in this PR.
- iOS path is a future additive step: add `@capacitor/ios`, create `game/ios/`, reuse the same `scoresRepo` and `isNative()` seam. Everything in this plan was designed so that step is a drop-in.

---

## 1. Project structure

### 1.1 Where the Android project lives

**Decision: `game/android/`** (sibling of `game/frontend/` and `game/backend/`).

Rejected alternatives:

| Location | Why rejected |
|---|---|
| `game/frontend/android/` | Putting a Gradle project inside an npm package means every `frontend/node_modules` cache bust and every CI artifact-upload step has to learn about `android/`. Keeps blowing up `frontend/` `.gitignore`. |
| `game/mobile/` (new package) | Would need a third `package.json` with a duplicated `vite build` step pointing at `../frontend`. Doubles the build matrix for zero gain; Capacitor is happy consuming `../frontend/dist` via a relative `webDir`. |
| Repo root `android/` | Confuses `coba/` and `home/` ownership. The Android artifact is strictly a Game artifact. |

`game/android/` gives us:
- **Clean app-level ownership.** Nothing above `game/` needs to know Android exists.
- **No impact on root `npm run dev`.** The root script concurrently-runs `npm --prefix game run dev:backend|dev:frontend` and never touches `game/android/`.
- **CI caching works.** `~/.gradle/caches` and `game/android/.gradle/` are naturally scoped.

Capacitor's CLI accepts a relative `webDir`, so pointing at `frontend/dist` from `game/capacitor.config.ts` is a one-line config (`webDir: 'frontend/dist'`).

### 1.2 `capacitor.config.ts` — expected shape (Android-only)

Location: `game/capacitor.config.ts`.

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.clickerbattle.app',
  appName: 'Clicker Battle',
  // Shared output with the web build. Vite writes here on every `npm run build`.
  webDir: 'frontend/dist',
  // No `server.url` — we ship a packaged, offline-capable bundle.
  // For local dev we override per-invocation (see §2.4).
  android: {
    // Matches the CSS theme on the splash/status bar while the WebView spins up.
    backgroundColor: '#0b0d12',
    // We only talk to our own HTTPS origin (and ws://loopback for local dev).
    allowMixedContent: false,
  },
  // Keep plugin config centralised so it is easy to audit.
  plugins: {
    CapacitorHttp: { enabled: false },     // we use fetch directly
    SplashScreen: {
      launchShowDuration: 300,
      backgroundColor: '#0b0d12',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
}

export default config
```

Notes:
- No `server.url` / `server.hostname` in production; the shell serves `webDir` over the internal `https://localhost` origin, which keeps cookies/localStorage/IndexedDB namespaced and persistent.
- For **live-reload dev** we run `npx cap run android --live-reload --external --host=<LAN-IP> --port=5174`; that's a CLI flag, not a committed config field.

### 1.3 `.gitignore` additions

Added to `game/.gitignore` (new file, not the repo-root one):

```
# Capacitor / Android
android/.gradle/
android/build/
android/app/build/
android/app/release/
android/local.properties
android/capacitor-cordova-android-plugins/
android/app/src/main/assets/public/
android/app/src/main/assets/capacitor.config.json
android/app/src/main/assets/capacitor.plugins.json
android/.idea/
android/*.iml
android/app/*.iml

# Release signing (keystore NEVER in repo)
android/app/release.keystore
android/keystore.properties
```

Specifically **committed** (Gradle wrapper caveat):
- `android/gradle/wrapper/gradle-wrapper.jar` — small (~60 KB), required for `./gradlew` to bootstrap without a pre-installed Gradle. Without it, fresh clones and CI runners can't build.
- `android/gradle/wrapper/gradle-wrapper.properties` — pins the Gradle version.
- `android/gradlew`, `android/gradlew.bat` — executable scripts.
- `android/app/src/main/res/` — icons and splash resources (editable PNGs + adaptive XML).
- `android/app/build.gradle`, `android/build.gradle`, `android/settings.gradle` — authored config.
- `android/variables.gradle` — SDK version pins that Capacitor 7 generates; overriding this file is the documented way to bump `compileSdk`/`targetSdk`.

We **do commit** the generated native project (`cap add android` output) once. The story "re-generate from scratch on every CI run" is unreliable — Capacitor explicitly documents committing `android/`.

### 1.4 Android icons and splash

Capacitor 7 uses the standard Android resource tree. Icons and splash live under `game/android/app/src/main/res/`:

- Adaptive icons: `mipmap-anydpi-v26/ic_launcher.xml`, `mipmap-anydpi-v26/ic_launcher_round.xml`, plus per-density PNGs in `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`.
- Splash: `drawable/splash.png` + density variants; theme colour in `values/styles.xml` (`@color/ic_launcher_background`).
- Play Store listing assets (feature graphic, screenshots, 512 px store icon) live in `game/docs/store/android/` — **not** shipped inside the APK, uploaded to Play Console separately.

**Authoring flow:** we use [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) (devDep, added in the implementation PR, not this plan) which generates every density variant from a 1024×1024 master `assets/icon.png` + `assets/splash.png`. Master sources live in `game/assets/`. This is the standard Capacitor recipe.

---

## 2. Build flow

### 2.1 New npm scripts (in `game/package.json`)

```jsonc
{
  "scripts": {
    // existing
    "dev:backend":  "npm --prefix backend run dev",
    "dev:frontend": "npm --prefix frontend run dev",
    "dev":          "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build":        "npm --prefix backend run build && npm --prefix frontend run build",

    // new — Android-specific. None of these touch backend/ or the reverse proxy.
    "build:web:android": "VITE_TARGET=android npm --prefix frontend run build",
    "sync:android":      "npm run build:web:android && cap sync android",
    "open:android":      "cap open android",
    "run:android":       "npm run build:web:android && cap run android",
    "run:android:live":  "cap run android --live-reload --external",
    "build:android":     "npm run sync:android && cd android && ./gradlew assembleRelease",
    "bundle:android":    "npm run sync:android && cd android && ./gradlew bundleRelease"
  }
}
```

What each does:

| Script | What it does | When to run |
|---|---|---|
| `build:web:android` | Builds the frontend Vite bundle with `VITE_TARGET=android` so the build can strip online-only code paths (§3). Output goes to `frontend/dist/` as usual. | Whenever web code changed, before a native sync. |
| `sync:android` | Rebuilds the web bundle, then runs `cap sync android` which copies `frontend/dist/` into `android/app/src/main/assets/public/` and writes `capacitor.config.json` + `capacitor.plugins.json`. | Standard pre-build step. |
| `open:android` | Opens Android Studio at `game/android/`. | For debugging layout/splash only. |
| `run:android` | Build + sync, then `gradlew installDebug` + launch on connected adb device. | Standard dev loop. |
| `run:android:live` | Starts Vite on the LAN (via Capacitor CLI) and points the WebView at it for hot reload. | Fast UI iteration while on a device. |
| `build:android` | Produces `android/app/build/outputs/apk/release/app-release.apk`. Requires keystore. | Tagged release (for side-loading / internal track). |
| `bundle:android` | Produces `android/app/build/outputs/bundle/release/app-release.aab`. Requires keystore. | Play Store upload. |

`cap` resolves to `./node_modules/.bin/cap` once `@capacitor/cli` is installed. Scripts are portable Windows/macOS/Linux because we don't use `&&` across platforms for anything shell-specific; the `cd android && ./gradlew …` line works in Git-Bash and POSIX and Windows PowerShell via Node npm-run.

### 2.2 Do web and Android need two builds? No.

Web and Android share **one Vite build** (`frontend/dist`). The only difference is a compile-time env var:

- `VITE_TARGET=web` (default, implicit) for web/S3 builds. Production `window.location` stays the source of truth for the backend origin.
- `VITE_TARGET=android` for the Capacitor package.

The target flag controls three things, all in `src/config.ts`:

1. Whether the `scoresRepo` resolves to `localScoresRepo` or `trpcScoresRepo` by default (§3.2).
2. Whether `BACKEND_HTTP_URL` / `BACKEND_WS_URL` default to the **production origin** (baked at build time via `VITE_BACKEND_HTTP_URL` / `VITE_BACKEND_WS_URL`) or to `window.location`.
3. Whether the "Online Multiplayer" button in the lobby is rendered (Android: only when `navigator.onLine === true`; Web: always).

We do not maintain two separate bundles, two `dist/` folders, or two Vite configs.

### 2.3 Root `npm run dev` is unaffected

The root `package.json` script chain (`coba-be`, `game-be`, `home-fe`, `coba-fe`, `game-fe`, `proxy`) has no Android step. Starting up the monorepo does not invoke Gradle or Capacitor. A fresh clone with no Android SDK still runs the full web stack identically.

The Android scripts live only in `game/package.json`. A developer without Android Studio can never accidentally trip over them.

### 2.4 Toolchain versions

- **Node:** >= 25 (already pinned in `.nvmrc`).
- **JDK:** 21 (Capacitor 7 requirement). On Windows install Temurin 21; on macOS `brew install temurin@21`.
- **Android Studio:** Ladybug (2024.2.1) or newer — Capacitor 7 requires it for Android Gradle Plugin 8.7.x.
- **Android Gradle Plugin:** 8.7.2 (what `cap add android` scaffolds in Capacitor 7).
- **Gradle:** 8.10.2 (set by the wrapper).
- **`compileSdk` / `targetSdk`:** **35** (Android 15). Play Console requires new app updates to target API 35 since Aug 31 2025.
- **`minSdk`:** **23** (Android 6.0). Capacitor 7 default. Covers ~99.5% of active Play devices.
- **Kotlin:** 1.9.25 (bundled with AGP 8.7.x).

These are declared in `android/variables.gradle` (generated by Capacitor, committed, edit-in-place to bump SDKs).

---

## 3. Offline architecture for solo + local-2p

### 3.1 Native-platform detection

One helper, at `game/frontend/src/platform.ts`:

```ts
import { Capacitor } from '@capacitor/core'

export function isNative(): boolean {
  return Capacitor.isNativePlatform()  // true on Android/iOS, false in any browser (incl. PWA)
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export const BUILD_TARGET = (import.meta.env.VITE_TARGET as 'web' | 'android' | undefined) ?? 'web'
```

We use **runtime detection** (`isNative()`) for behaviour switches and the **build-time flag** (`BUILD_TARGET`) for tree-shaking server-only code out of the Android bundle. The runtime check is the source of truth at runtime; the build flag is purely a bundle-size/safety optimisation.

### 3.2 Leaderboard — recommended strategy: **local-only on device, with manual export**

Options considered:

| Option | Pros | Cons | Recommended? |
|---|---|---|---|
| (a) Local-only on device (SQLite) | Dead simple. Works 100% offline. No auth. No server-side schema change. | Scores don't sync across devices or to the web leaderboard. | **Yes, for v1.** |
| (b) Sync to server on reconnect | Unified leaderboard across web + Android. | Needs user identity (device ID? anonymous UUID? Play Games sign-in?). Needs conflict/dedup rules. Play Data Safety form gets heavier. | No (future v2). |
| (c) Hybrid: local-first, opt-in upload | Matches user intent. | User has to understand both. UI cost is bigger than (a) + (b) combined. | No. |

**v1 recommendation: (a).** The current web leaderboard is anonymous (just a free-text player name) — a cross-device merge is not meaningful without accounts, and adding accounts is the single biggest scope expander we could choose. Ship local-only; revisit when/if we add Play Games Services.

If we later want (b), the seam is trivial: add a `sync()` method to `localScoresRepo` that `POST`s unsynced rows to `trpc.scores.add`. The repo abstraction in §3.3 makes this additive.

### 3.3 The `scoresRepo` seam — exactly which files change

**New files:**

- `game/frontend/src/data/scores-repo.ts` — interface:
  ```ts
  export interface ScoreRow {
    id: number | string
    player: string
    score: number
    createdAt: string
  }

  export interface ScoresRepo {
    list(): Promise<ScoreRow[]>
    add(input: { player: string; score: number }): Promise<{ id: number | string }>
  }
  ```
- `game/frontend/src/data/scores-repo.trpc.ts` — wraps today's `trpcClient.scores.{list,add}` to fit the interface. **No logic change** vs. today, just a shape match.
- `game/frontend/src/data/scores-repo.local.ts` — uses `@capacitor-community/sqlite` to open `clicker_battle.db`, a single table:
  ```sql
  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player     TEXT NOT NULL,
    score      INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS scores_score_desc ON scores (score DESC);
  ```
  Rationale for SQLite over `@capacitor/preferences`: Preferences is key-value only, no ORDER BY, no LIMIT — we'd have to load the full array, sort in JS, and re-serialise on every write. SQLite gives us the same query the server does (`ORDER BY score DESC LIMIT 10`) and handles 10K+ rows painlessly.
- `game/frontend/src/data/scores-repo.ts` also exports the factory:
  ```ts
  import { isNative } from '../platform'
  export function getScoresRepo(): ScoresRepo {
    return isNative() ? localScoresRepo : trpcScoresRepo
  }
  ```

**Edited files:**

- `game/frontend/src/App.tsx` — `LeaderboardView` (lines 930–989):
  - `useQuery(trpc.scores.list.queryOptions())` → `useQuery({ queryKey: ['scores'], queryFn: () => getScoresRepo().list() })`.
  - `trpcClient.scores.add.mutate(vars)` → `getScoresRepo().add(vars)`.
  - No other line in `LeaderboardView` moves.
- `game/frontend/src/trpc.ts` — `httpBatchLink({ url: '/game/trpc' })` gains a resolver:
  ```ts
  url: () =>
    import.meta.env.VITE_BACKEND_HTTP_URL
      ? `${import.meta.env.VITE_BACKEND_HTTP_URL}/trpc`
      : '/game/trpc',
  ```
  In Android builds, `VITE_BACKEND_HTTP_URL` is `https://clickerbattle.example.com/game` so the online multiplayer lobby (which still needs the server) works when online. In solo/local-2p the tRPC client is simply never called on Android.

The `scoresRepo` seam is the minimal surface area. If we later need (b) from §3.2, the local repo grows a `syncPending()` method and nothing in `App.tsx` changes.

### 3.4 Online multiplayer under the Android shell

Three states, enforced in the Lobby view:

| Network | Multiplayer button |
|---|---|
| `navigator.onLine === false` on Android | Disabled, with "Online multiplayer requires an internet connection" subtitle. Solo and local-2p remain tappable. |
| Online, WS connect fails (bad connectivity, backend down, DNS) | Button stays enabled; on tap, shows an inline error "Could not reach the server — playing offline instead". |
| Online, WS connects OK | Existing flow, identical to web. |

Implementation: a small `useOnline()` hook wrapping `window.addEventListener('online'/'offline')`. On Android, Capacitor 7 surfaces network status via `@capacitor/network`, which is strictly more reliable than `navigator.onLine` on Android WebView — we use `@capacitor/network` only when `isNative()`.

**WebSocket code path is unchanged.** `App.tsx:92-95`'s `getWsUrl()` becomes `BACKEND_WS_URL` from `src/config.ts` (already planned in MOBILE-DEPLOYMENT.md §"Concrete first PR"). Nothing else in the WS loop cares whether we're on web or Android.

### 3.5 Local 2-player (future, offline)

The eventually-merged local-2p mode runs **entirely client-side** on both web and Android: two touch targets side-by-side, one state machine, the existing 30-second timer. No WebSocket. Because it never calls the server, it's offline by construction — no repo changes needed beyond whatever `scores` entry it writes at the end (`localScoresRepo.add` on Android; `trpcScoresRepo.add` on web, which is what web already does).

### 3.6 Service worker / PWA interplay

**Recommendation: do not ship a service worker inside the Android bundle.**

- Inside Capacitor, the WebView serves `android/app/src/main/assets/public/` over `https://localhost`. Everything is already on-device — there is nothing for a service worker to cache. A SW would only add a registration failure window on first launch and a cache-versioning headache on app update.
- On the **web** build, `vite-plugin-pwa` still ships (as planned in `MOBILE-DEPLOYMENT.md`) because S3 users benefit from offline shell caching and "install to home screen".
- We **gate the `registerSW()` call** on `!isNative()` in `main.tsx`. Same bundle; different runtime registration.

---

## 4. Deployment / distribution

### 4.1 Signing

- **Debug:** Android Studio auto-generates `~/.android/debug.keystore`. No action needed. `gradlew installDebug` uses it transparently.
- **Release:** one keystore (`release.keystore`) shared by all release builds. Generated once with:
  ```bash
  keytool -genkeypair -v -keystore release.keystore \
    -alias clickerbattle -keyalg RSA -keysize 2048 -validity 10000
  ```
- **Keystore storage:**
  - **NOT in the repo.** Added to `.gitignore` in §1.3.
  - Canonical copy stored in the project's password manager (1Password / Bitwarden team vault), re-exported to the release maintainer's laptop only when cutting a build.
  - CI copy: base64-encoded and stored as `ANDROID_KEYSTORE_BASE64` + `ANDROID_KEYSTORE_PASSWORD` + `ANDROID_KEY_ALIAS` + `ANDROID_KEY_PASSWORD` GitHub Actions secrets. The workflow decodes it to `android/app/release.keystore` at build time and deletes it on teardown.
  - **Losing this keystore = losing the ability to update the app** on Play Store. Back up to two independent locations.
- **Play App Signing (recommended):** enroll at first upload. Google re-signs with their own key; our upload key becomes replaceable if lost. This is the current default for new Play apps and we should accept it.

### 4.2 Play Console — basics

1. **Internal testing track first** — invite-only, up to 100 testers, no review delay, ~1 hour from upload to install. Used for every build leading up to the first production release.
2. **Closed testing** (optional) — larger audience, still invite-only; Play occasionally reviews.
3. **Production** — full review (hours to a few days for a first submission).
4. **One-time setup:** $25 developer registration fee, Data Safety form, content rating (IARC questionnaire — our app will rate 3+ / Everyone), ads declaration (no), target audience (likely 13+ to avoid COPPA paperwork; the app collects only a voluntary nickname).
5. **Store listing:** 80-char short description, 4000-char full description, 512 px store icon, 1024×500 feature graphic, at least two phone screenshots. Assets live in `game/docs/store/android/`.

### 4.3 Version management

Mapping:

| Web (Vite) | Android (Gradle) | Source |
|---|---|---|
| `VITE_BUILD_NUMBER` (monotonic integer) | `versionCode` | CI env (see §4.4) |
| `package.json:version` (semver) | `versionName` | `game/frontend/package.json` |

`android/app/build.gradle` reads both:

```groovy
def versionCodeFromEnv = System.getenv("ANDROID_VERSION_CODE") ?: "1"
def versionNameFromEnv = System.getenv("ANDROID_VERSION_NAME") ?: "0.0.0"
android {
  defaultConfig {
    versionCode versionCodeFromEnv.toInteger()
    versionName versionNameFromEnv
  }
}
```

**Release bump flow:**
1. Edit `game/frontend/package.json` `version` → `0.2.0`.
2. Tag `git tag game-v0.2.0 && git push --tags`.
3. CI reads the tag, sets `ANDROID_VERSION_NAME=0.2.0` and `ANDROID_VERSION_CODE=<tag count>`.
4. `npm run bundle:android` produces the signed AAB.

`versionCode` is strictly monotonic — Play Console rejects any upload with a `versionCode` <= the highest previously-uploaded one. Using "count of matching tags" ensures this without human error.

### 4.4 Proposed CI workflow (sketch, NOT committed as YAML in this PR)

File path (for the later implementation PR): `.github/workflows/android-release.yml`.

Triggers:
- `push` on a tag matching `game-v*` (release).
- `workflow_dispatch` (manual, for internal-track debugging).

**Does NOT trigger on** `push` to `main` or on PRs — we don't want every merge to build a signed AAB.

Sketch (do not copy to a real workflow file in this PR — it's illustrative):

```markdown
name: Android release

on:
  push:
    tags: ['game-v*']
  workflow_dispatch:

jobs:
  build-aab:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '25' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }
      - name: Install Android SDK
        uses: android-actions/setup-android@v3
        with: { api-level: 35, build-tools: '35.0.0' }
      - name: npm ci (game)
        run: npm ci --prefix game
      - name: Decode keystore
        run: |
          echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > game/android/app/release.keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
      - name: Derive versionCode
        run: |
          echo "ANDROID_VERSION_NAME=${GITHUB_REF_NAME#game-v}" >> $GITHUB_ENV
          echo "ANDROID_VERSION_CODE=$(git tag -l 'game-v*' | wc -l)" >> $GITHUB_ENV
      - name: Build AAB
        run: npm --prefix game run bundle:android
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          VITE_BACKEND_HTTP_URL: https://clickerbattle.example.com/game
          VITE_BACKEND_WS_URL: wss://clickerbattle.example.com/game/ws
          VITE_TARGET: android
      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: clicker-battle-${{ env.ANDROID_VERSION_NAME }}.aab
          path: game/android/app/build/outputs/bundle/release/app-release.aab
      - name: Teardown keystore
        if: always()
        run: rm -f game/android/app/release.keystore
```

**Crucially:** this workflow is **additive**. It does not touch any existing web-deploy workflow. If it fails, the web deploy is unaffected.

### 4.5 Local developer loop — clean checkout to running app

Assumes: Node 25, JDK 21, Android Studio Ladybug+, Android SDK 35, ADB on PATH, a device in USB-debug mode or a running emulator.

```bash
git clone <repo> && cd code
npm install                              # root (concurrently only)
npm --prefix game install                # + @capacitor/core, @capacitor/cli, @capacitor/android, @capacitor-community/sqlite, @capacitor/network
npm --prefix game/frontend install
npm --prefix game/backend install

# One-time only, the first time on a fresh checkout after the Capacitor-init PR lands:
cd game && npx cap sync android

# Fast UI loop (hot-reload from Vite, device shows the app pointed at LAN IP)
npm --prefix game run run:android:live

# Packaged run (matches what ends up on Play Store, minus signing)
npm --prefix game run run:android
```

For the web app, `npm run dev` from the root is unchanged.

---

## 5. Impact on existing deployment

**Goal: zero changes** to the files below. Confirmed against current tree:

| File / dir | Change? |
|---|---|
| `scripts/dev-proxy.mjs` | **No.** Proxy has no Android route. |
| Root `package.json` | **No.** No new root script; Android lives under `game/`. |
| `.nvmrc` | **No.** Node 25 already pinned. |
| `coba/` | **No.** Untouched. |
| `home/` | **No.** Untouched. |
| `game/backend/` | **No.** The backend does not know Android exists. No new endpoints, no new deps, no schema changes. |
| `game/frontend/vite.config.ts` | **No edits required**, but the existing `base: '/game/'` stays — Android Capacitor serves assets from the WebView root, which works fine with a `/game/` base because the HTML written to `dist/index.html` uses relative paths for assets. |
| `game/frontend/index.html` | Small edits (PWA meta tags) **already planned in `MOBILE-DEPLOYMENT.md`** — not a new change introduced by this Android plan. |

**S3 + CloudFront/proxy deploy stays byte-identical.** The Android AAB is produced by a separate pipeline, written to Play Console, and never shares a bucket with the web build.

---

## 6. Sequenced rollout (ordered checklist)

Estimates are engineer-hours, single-threaded. Each step is reviewable as its own PR.

| # | Step | Hours | Files touched | Reversible? |
|---|---|---|---|---|
| 1 | Land PR #22 (`MOBILE-DEPLOYMENT.md` + this doc) | ~0 | `game/docs/*.md` | Trivially |
| 2 | Extract `src/config.ts`, `src/platform.ts`; add `VITE_BACKEND_HTTP_URL`/`VITE_BACKEND_WS_URL` env handling; `.env.example`; swap `App.tsx` `getWsUrl()` and `trpc.ts` URL to use it. **Behaviour on web is byte-identical** (fallback to `window.location`). | 3 | `game/frontend/src/config.ts`, `platform.ts`, `App.tsx`, `trpc.ts`, `.env.example` | Yes |
| 3 | Introduce `scoresRepo` abstraction with **only the tRPC implementation**; wire `LeaderboardView` through it. **No Capacitor yet.** Web behaviour unchanged; zero test impact. | 3 | `game/frontend/src/data/*.ts`, `App.tsx` | Yes |
| 4 | Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor-community/sqlite`, `@capacitor/network`, `@capacitor/assets` in `game/`. Scaffold `game/capacitor.config.ts` + `npx cap add android` to generate `game/android/`. Commit native project. | 4 | `game/package.json`, `game/package-lock.json`, new `game/capacitor.config.ts`, new `game/android/` (hundreds of files), `game/.gitignore` | Yes (delete folder) |
| 5 | Add `localScoresRepo` (SQLite) + factory switch on `isNative()`. First time solo scores persist on Android. | 6 | `game/frontend/src/data/scores-repo.local.ts`, factory in `scores-repo.ts` | Yes |
| 6 | Online-detection UX: `useOnline()` hook, gated MP button, inline WS-failure message. | 3 | `game/frontend/src/App.tsx` (LobbyView only) | Yes |
| 7 | Generate icons + splash via `@capacitor/assets` from master `assets/icon.png` + `assets/splash.png`. | 2 | `game/assets/`, `game/android/app/src/main/res/` | Yes |
| 8 | First **unsigned** debug APK, side-loaded on a real device. End-to-end smoke test of solo → local-2p (if landed) → online MP. | 4 | none (Android Studio + ADB only) | Yes |
| 9 | Generate release keystore, document in password manager, `ANDROID_KEYSTORE_*` secrets in GitHub. | 2 | Secrets only | Partially (rotate-only) |
| 10 | Add version-code plumbing to `android/app/build.gradle`; tag `game-v0.1.0`; cut first signed AAB **locally**. | 2 | `game/android/app/build.gradle` | Yes |
| 11 | Create Play Console app, Data Safety form, content rating, screenshots, store listing. Upload AAB to **internal testing** track. | 4 | `game/docs/store/android/` | Partially (app record stays) |
| 12 | Dogfood internal track for ≥ 1 week across ≥ 3 devices (different Android versions). Fix bugs; re-release. | ~ | varies | Yes |
| 13 | Add `.github/workflows/android-release.yml` (the sketch in §4.4). | 3 | `.github/workflows/` | Yes |
| 14 | Promote to **closed testing** or straight to **production**. | 2 + review wait | Play Console only | No (public release) |

Approximate total: **~38 engineer-hours** of code, plus review/dogfood time and Play Console wait. Matches the 5–8 day band from `MOBILE-DEPLOYMENT.md`.

Steps 1–8 are all reversible; step 9 introduces a non-recoverable asset (keystore); steps 11 and 14 commit us to a public app record.

---

## 7. Risks & open questions

### 7.1 Risks

- **APK size.** A Capacitor 7 Android shell + our Vite bundle + SQLite plugin lands around **6–9 MB APK / 4–6 MB AAB download** based on comparable apps. React Native equivalents sit at 25–40 MB. Unlikely to be an issue for us, but we'll measure in step 8.
- **WebView Chromium version skew.** Android System WebView updates out of band via Play Services on modern devices (>= Android 7), but some older OEMs (some pre-2020 Samsung and Huawei) ship outdated WebViews. We mitigate by:
  - `minSdk = 23` still covers the affected range; we accept slightly rougher rendering on ancient devices.
  - Our JS targets `es2020`, which every WebView since Chrome 80 supports.
  - If we get a field report of rendering bugs on a specific device, the fallback is to bump `minSdk` rather than patch the bundle.
- **Local storage quotas.** SQLite via `@capacitor-community/sqlite` writes to the app's internal storage (`/data/data/com.clickerbattle.app/databases/`), not the shared partition. No quota in practice (only constrained by device free space). By contrast, IndexedDB / localStorage in the WebView *does* have quotas and can be evicted under memory pressure — another reason we use SQLite, not `@capacitor/preferences`.
- **Battery / idle during the 30s clicker loop.** `requestAnimationFrame` continues to fire at up to 60 Hz while the app is foreground; Android does **not** throttle rAF aggressively the way iOS Safari does. Backgrounding the app pauses rAF — we treat that as a game abort (matches web behaviour). The 30-second loop is short enough that thermal throttling is a non-issue; we verified on a mid-range device (Pixel 6a) in our earlier web profiling session.
- **Accessibility of touch targets in local 2-player split-screen.** Two side-by-side 44×44 dp hit regions work on phones ≥ 5.5", break on anything smaller. We'll enforce a minimum 320 dp per side and add a "not supported on small screens" warning if the arena shrinks below that.
- **Play Store review rejection.** Risks are:
  - **"Broken experience" rejections** if online MP fails loudly when offline. Mitigation in §3.4 above.
  - **Data safety form mismatch.** We must declare: no data collected if player never submits a nickname; if they do, it's stored locally only. No analytics SDK in v1.
  - **Ad disclosure:** N/A (no ads).
  - **Kid-friendly category / COPPA.** Target audience set to **13+** avoids COPPA. The app has no chat, no UGC beyond the player nickname, so this is defensible.
- **First-install keystore loss.** Most operationally dangerous risk, and cheapest to mitigate: back up `release.keystore` to two independent stores before the first Play upload. Play App Signing softens this (we can rotate upload keys) but doesn't eliminate it.

### 7.2 Open questions the implementation PR needs answers on

1. **Final `appId`.** `com.clickerbattle.app` is used throughout this doc as a placeholder. We need the real one before the first Play Console record is created (it can never be changed afterwards for that listing).
2. **Who owns the Play Console developer account?** $25 one-time. Options: individual account under the team lead, or a new Google Workspace org.
3. **Is Play App Signing acceptable?** Google holds the app-signing key; we hold only the upload key. This is the modern default and strongly recommended, but flagging for an explicit yes/no.
4. **Backend prod URL for the Android build.** The bundle bakes `VITE_BACKEND_HTTP_URL` / `VITE_BACKEND_WS_URL` at build time. We need the final production hostname (not `clickerbattle.example.com`) before the first signed release — changing it post-launch requires a new release.
5. **Player nickname policy.** Web's tRPC leaderboard accepts any 1–50 char printable-ASCII-or-extended-unicode string. On Android (local-only v1) we can be stricter without affecting other users. Match web, or tighten?
6. **Single-player mode scope.** This plan assumes "single-player mode" = the existing `LeaderboardView` click-and-submit flow. If we're planning a richer solo mode (timer, modes, score curve) before or during this rollout, the `scoresRepo` interface may want a richer `ScoreRow` (mode, duration, modifiers). Easy to extend but worth confirming upfront.

---

## 8. iOS — one line on extensibility

Everything above (project layout at `game/android/`, the `isNative()` seam, the `scoresRepo` abstraction, the `VITE_TARGET` flag, the build scripts naming pattern) was designed so adding iOS is **additive**: install `@capacitor/ios`, `npx cap add ios` to generate `game/ios/`, mirror the Android scripts (`build:ios`, `sync:ios`, etc.), reuse the same repo code. No refactor of `frontend/src/` is required.

---

## Sources

- [Google Play target API level requirement — Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Meet Google Play's target API level requirement — Android Developers](https://developer.android.com/google/play/requirements/target-sdk)
- [Updating to Capacitor 7.0 — capacitorjs.com](https://capacitorjs.com/docs/updating/7-0)
- [Setting Android Target SDK — capacitorjs.com](https://capacitorjs.com/docs/android/setting-target-sdk)
- [capacitor-community/sqlite — GitHub](https://github.com/capacitor-community/sqlite)
- [Capacitor Storage Guide — capacitorjs.com](https://capacitorjs.com/docs/guides/storage)
- [Android SDK Version Compatibility Guide — Ionic Portals](https://ionic.io/docs/portals/for-android/version-matrix)
- [Capacitor Android build.gradle (main) — GitHub](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/build.gradle)
