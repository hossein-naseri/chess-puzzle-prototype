# AdMob config

App: `com.lowpolyllamas.chessdoku`

| | value |
|---|---|
| App ID | `ca-app-pub-7235972156134582~3977643103` |
| Banner ad unit ID | `ca-app-pub-7235972156134582/7118434464` |
| Interstitial ad unit ID | `ca-app-pub-7235972156134582/6310066476` |
| Rewarded ad unit ID | `ca-app-pub-7235972156134582/6804890495` |

Tell App ID from an ad unit ID by the separator: `~` = App ID (one per
app), `/` = ad unit ID (one per format).

## Not wired into the app yet — on purpose

`js/ads.js` still runs its simulated banner/interstitial/rewarded flow (see
`SAGA.md`). There is currently no real AdMob SDK anywhere in this project —
these IDs will be consumed once `@capacitor-community/admob` is installed as
part of scaffolding the native Android project. Until then they're just
staged here.

When that wiring happens, the build defaults to **Google's public test ad
unit IDs** (safe for anyone to tap, no registration needed) and only uses
the real IDs above in a release build. Real-device test-mode registration
(AdMob's per-device test-ad override for *real* ad unit IDs) is a separate,
later step during native testing — not needed for anything up to that
point.
