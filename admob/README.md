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

## Wired in — but guarded off by default

`webapp/js/ads.js` calls the real `@capacitor-community/admob` plugin
whenever the app is running inside the native Capacitor shell (see
`SAGA.md`). A `TEST_MODE` constant at the top of that file currently forces
every ad request to use **Google's public test ad unit IDs** (below) and
`isTesting: true`, regardless of the real IDs above — so nothing here can
serve or be clicked as a real ad, or risk your account, until someone
deliberately flips `TEST_MODE` to `false` for a release build.

Google's test IDs in use today (safe for anyone to tap, no registration
needed): App `ca-app-pub-3940256099942544~3347511713`, Banner
`ca-app-pub-3940256099942544/6300978111`, Interstitial
`ca-app-pub-3940256099942544/1033173712`, Rewarded
`ca-app-pub-3940256099942544/5224354917`.

In a plain browser (no native shell), `js/ads.js` still runs the original
simulated banner/interstitial/rewarded flow, unchanged.
