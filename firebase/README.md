# Firebase config

- **App ID (package name):** `com.lowpolyllamas.chessdoku`
- **Firebase project:** `chessdoku-252ca`

**Wired in.** A copy now lives at `android/app/google-services.json`
(Gradle's expected location — this copy here stays as the source of truth
and a record of where it came from). `android/app/build.gradle` already
applies the Google Services plugin conditionally whenever that file is
present, so no manual Gradle edit was needed. `webapp/js/analytics.js`
forwards every `SL.Analytics.log()` call to real Firebase Analytics
whenever the app is running inside the native Capacitor shell (see
`SAGA.md`'s "Ads & analytics: how the real wiring works" section) — in a
plain browser it still just logs to the console, unchanged.

Committing `google-services.json` to the repo is normal practice, not a
leak: Google's own guidance is that it ships inside the public APK anyway
and carries no write-access secret, only identifiers scoped to reading/
writing this Firebase project's own client-side services (Firebase's
official sample apps on GitHub commit theirs the same way).
