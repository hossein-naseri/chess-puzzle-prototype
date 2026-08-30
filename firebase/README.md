# Firebase config

- **App ID (package name):** `com.lowpolyllamas.chessdoku`
- **Firebase project:** `chessdoku-252ca`

`google-services.json` in this folder is staged here because there's no
Android project yet to put it in. Once we run `npx cap add android`, this
file moves to `android/app/google-services.json` (Capacitor/Gradle's
expected location) and the Firebase Analytics plugin gets added to
`android/app/build.gradle`. At that point `js/analytics.js`'s `send()`
function switches from `console.log` to the real
`FirebaseAnalytics.logEvent(...)` call — see the TODO comment at the top of
that file.

Committing `google-services.json` to the repo is normal practice, not a
leak: Google's own guidance is that it ships inside the public APK anyway
and carries no write-access secret, only identifiers scoped to reading/
writing this Firebase project's own client-side services (Firebase's
official sample apps on GitHub commit theirs the same way).
