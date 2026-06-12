# Maestro — E2E flows (Set Vôlei Hub)

End-to-end UI tests for the app, written as [Maestro](https://maestro.mobile.dev) flows.
The flows live in [`.maestro/`](./.maestro) and use **`testID` (set via `accessibilityLabel`/`testID` on the components) as the primary selector**, falling back to visible text only for final assertions.

```
.maestro/
├── config.yaml            # suite config (run order, which files are flows)
├── subflows/
│   └── login.yaml         # reusable login steps (pulled in via runFlow)
├── 01-login.yaml          # sign in with the seeded mock user
├── 02-checkin.yaml        # check in on today's training
├── 03-edit-profile.yaml   # edit + save the profile name
└── 04-logout.yaml         # log out, back to the login screen
```

Every flow launches with `clearState: true` so each run starts from a clean,
logged-out app. The login storage re-seeds the mock user on first login, so the
default credentials always work:

| Field    | Value                   |
| -------- | ----------------------- |
| E-mail   | `pedrocoelho@gmail.com` |
| Password | `123`                   |

---

## 1. Install Maestro (once)

```bash
# macOS / Linux
curl -fsSL "https://get.maestro.mobile.dev" | bash

# verify
maestro --version
```

iOS additionally needs Xcode + `xcode-select --install` and
[Facebook IDB](https://github.com/facebook/idb). Android needs the Android SDK
(`adb` on your `PATH`).

---

## 2. The `APP_ID`

The flows reference the app through `appId: ${APP_ID}`. This must match the
installed app's bundle identifier:

- **iOS** → `expo.ios.bundleIdentifier` in `app.json`
- **Android** → `expo.android.package` in `app.json`

This project does not declare them yet, so add them before building, e.g.:

```jsonc
// app.json
{
  "expo": {
    "ios":     { "bundleIdentifier": "com.setvolei.hub" },
    "android": { "package": "com.setvolei.hub" }
  }
}
```

Then export it for Maestro (used by every command below):

```bash
export APP_ID=com.setvolei.hub
```

> **Expo Go is not recommended for Maestro.** Maestro launches an app by its
> bundle id; in Expo Go that id is `host.exp.Exponent` and you cannot reliably
> target your JS bundle. Use a **development build** or a **production build**
> instead (next step).

---

## 3. Build & install the app on a simulator/emulator

Maestro drives a **real installed binary**, not the Metro/JS bundle directly.
Create a native build that embeds the dev client or the production bundle:

```bash
# iOS simulator (installs the app and a dev client)
npx expo run:ios

# Android emulator / connected device
npx expo run:android
```

or, with EAS, download an internal-distribution build and install it:

```bash
eas build --profile development --platform ios      # or android
# then drag the .app to the simulator / `adb install app.apk`
```

Leave the Metro bundler running (`npx expo start --dev-client`) while the flows
execute so the JS loads.

---

## 4. Run the flows locally

Boot a simulator/emulator first (e.g. open it from Xcode / Android Studio, or
`xcrun simctl boot "iPhone 15"` / `emulator -avd Pixel_7`).

```bash
# from the app folder (set-volei/)

# Whole suite, in the order defined in config.yaml
maestro test -e APP_ID=$APP_ID .maestro/

# A single flow
maestro test -e APP_ID=$APP_ID .maestro/01-login.yaml

# Override credentials at run time
maestro test -e APP_ID=$APP_ID -e EMAIL=outro@email.com -e PASSWORD=abc .maestro/01-login.yaml
```

### iOS vs Android

The same flows run on both platforms — Maestro picks the running device. To be
explicit when several are connected:

```bash
maestro --device "iPhone 15"      test -e APP_ID=$APP_ID .maestro/
maestro --device "emulator-5554"  test -e APP_ID=$APP_ID .maestro/
```

### Author/debug interactively

```bash
maestro studio          # visual selector inspector + flow recorder
maestro test --watch -e APP_ID=$APP_ID .maestro/02-checkin.yaml
```

---

## 5. Running in CI

Two common options.

### Option A — Maestro Cloud (no emulator to manage)

Upload the built binary; Maestro Cloud runs the flows on real/managed devices.

```yaml
# .github/workflows/maestro-cloud.yml
name: Maestro Cloud
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Build (or download) your .apk / .app first and expose its path.
      # Example assumes an EAS build artifact downloaded to ./build/app.apk
      - name: Run flows on Maestro Cloud
        uses: mobile-dev-inc/action-maestro-cloud@v1
        with:
          api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
          app-file: ./build/app.apk        # or app.app (iOS .zip)
          workspace: ./set-volei/.maestro
          env: |
            APP_ID=com.setvolei.hub
            EMAIL=pedrocoelho@gmail.com
            PASSWORD=123
```

### Option B — Self-hosted Android emulator on the runner

```yaml
# .github/workflows/maestro-android.yml
name: Maestro Android (emulator)
on: [push, pull_request]

jobs:
  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: set-volei/package-lock.json }

      - name: Install deps
        working-directory: set-volei
        run: npm ci --legacy-peer-deps

      - name: Install Maestro
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"

      # Build a debug APK (expo prebuild + gradle) and install it on the emulator.
      - name: Run Android emulator + Maestro
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          arch: x86_64
          working-directory: set-volei
          script: |
            npx expo run:android --variant debug --no-bundler &
            adb wait-for-device
            export APP_ID=com.setvolei.hub
            maestro test -e APP_ID=$APP_ID .maestro/
```

> iOS in CI requires a `macos-latest` runner (Xcode + simulator). The steps are
> the same: install Maestro, `npx expo run:ios`, then
> `maestro test -e APP_ID=$APP_ID .maestro/`.

Maestro writes a JUnit report you can publish as a CI artifact:

```bash
maestro test --format junit --output maestro-report.xml -e APP_ID=$APP_ID .maestro/
```

---

## Troubleshooting

| Symptom                                   | Fix                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `Element not found: id: login-email-input`| The app didn't finish the 4s splash — the flows already wait 15s, but confirm Metro is running and the JS bundle loaded. |
| App never launches                        | `APP_ID` doesn't match the installed bundle id (`app.json` → ios.bundleIdentifier / android.package). |
| Check-in button missing in `02-checkin`   | A previous run left today as "present". The flow uses `clearState: true`; make sure it wasn't removed. |
| Running `.maestro/` runs `login.yaml` alone| Keep `config.yaml` (`flows: ["*.yaml"]`) — it excludes `subflows/`.                     |
