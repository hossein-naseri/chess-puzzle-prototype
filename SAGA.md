# Sightlines — vertical slice

33 levels, a saga-style level map with four chapters, monetization stubs,
and a synthesised sound set. Lives in `webapp/` (the real source — this is
what a Capacitor build should wrap). `dist/sightlines.html` is a single
bundled file of the same app, built purely so it can be shared as one link;
don't hand-edit it, regenerate with `python3 tools/bundle.py`.

## The 33 levels

Generated and independently verified by `solver/build_saga.py` (regenerate
with `python3 solver/build_saga.py`). Every level: unique solution, no unit
repeats, no piece sees its own twin, and solvable by pure propagation — no
guessing — at its declared technique cap. Reaching a full grid by
propagation alone is itself a proof of uniqueness (every placement was
forced), so that check *is* the uniqueness check.

| Chapter | Levels | Baseline technique | Spike (miniboss/boss) |
|---|---|---|---|
| Prologue | I – III (Roman) | singles only | — |
| The Open Game | 1 – 10 | singles only | vision pointing |
| The Middlegame | 1 – 10 | vision pointing | line/box lock |
| The Endgame | 1 – 10 | line/box lock | line/box lock, minimum clues |

Full table (technique, clue count, knight-clue present):

```
Prologue       I     tutorial   singles only      16 clues
Prologue       II               singles only      13 clues
Prologue       III              singles only      11 clues
Open Game      1                singles only      10 clues
Open Game      2                singles only      10 clues
Open Game      3                singles only       9 clues
Open Game      4                singles only       9 clues
Open Game      5    MINIBOSS    vision pointing     7 clues
Open Game      6                singles only        8 clues
Open Game      7                singles only        8 clues
Open Game      8                singles only        7 clues
Open Game      9                singles only        7 clues
Open Game      10   BOSS        vision pointing     6 clues
Middlegame     1-4              vision pointing   7,7,6,6 clues
Middlegame     5    MINIBOSS    line/box lock       5 clues
Middlegame     6-9              vision pointing   6,5,5,5 clues
Middlegame     10   BOSS        line/box lock       4 clues
Endgame        1-4              line/box lock     6,6,5,5 clues
Endgame        5    MINIBOSS    line/box lock       4 clues
Endgame        6-9              line/box lock     5,5,4,4 clues
Endgame        10   BOSS        line/box lock       4 clues (hardest in the game)
```

Miniboss/boss levels spike to a harder technique than their neighbours, then
the baseline drops back down after — the "spike and release" curve, not a
monotonic ramp. Onboarding has no miniboss/boss tag; the assumption was that
badging the tutorial's own levels as bosses would undercut the tutorial. If
you want III to carry a badge too, that's a one-line change in
`solver/build_saga.py`'s `SPECS` table.

**Knight clues**: every single level ended up with at least one Knight as a
starting clue (32/33 targeted it explicitly; the removal search is biased to
drop non-Knight clues first, which turned out generous enough that Knights
survived even where not required). Level I alone starts with several.

## Level lock / skip rules

A level is unlocked if: it's the very first level, OR the immediately
preceding level is completed, OR it's a chapter's first level and that
chapter's skip was used.

```
unlocked(i) = (i == 0)
           || completed(level[i-1])
           || (isChapterStart(i) && skipUsed(chapter(i)))
```

Beating a chapter's boss unlocks the next chapter's first level through the
*ordinary* rule above — no separate flag needed, and the barrier is hidden
automatically once that's true. The skip button is the only other way past
a barrier, and it only unlocks that one gateway level — every other level
in the chapter still needs the level before it beaten. Verified against the
exact scenario in the spec (mid-Open-Game, skip to Middlegame): levels 6-10
of the Open Game stay locked, level 1 of the Middlegame unlocks, and both
the level you left off on and the new one are playable afterward.

All four chapter transitions carry a skip button, including
Prologue → Open Game, for consistency — skipping past the last bit of
onboarding is a real (if unlikely) case: a player who's already comfortable
skipping II or III to get to the real game.

## Project layout

```
webapp/index.html          saga screen + game screen markup, both toggled by [hidden]
webapp/css/styles.css      all styling: theme tokens, board, saga map, modals, ads, tutorial
webapp/js/native-bridge.js generated (see below) - the one non-plain-script file
webapp/js/data.js          generated - SL.BOARD / SL.SECTIONS / SL.LEVELS
webapp/js/rules.js         board geometry + chess-sudoku rule engine (pure functions)
webapp/js/storage.js       progress persistence (localStorage today)
webapp/js/analytics.js     analytics choke point - console + in-memory log, +Firebase natively
webapp/js/ads.js           banner / interstitial / rewarded - simulated in-browser, +AdMob natively
webapp/js/audio.js         WebAudio synthesised sound effects
webapp/js/game.js          board screen: render, two-tap placement, hints, tutorial, completion
webapp/js/saga.js          level-select map: lock state, chapters, barriers, skip modal
webapp/js/diagnostics.js   crash reporting + performance tracing - console only in browser, +Firebase natively
webapp/js/main.js          view router, boot sequence, toast helper
native-bridge/src/index.js the only file that imports an npm package (see below)
android/                   the native Capacitor Android project (generated, then hand-edited)
firebase/, admob/          credentials + what's wired where
```

## Ads & analytics: how the real wiring works

Real AdMob and Firebase Analytics are wired in. Both are **native SDKs** —
they don't run inside a plain web page — so `js/ads.js` and
`js/analytics.js` each carry two code paths and pick between them at load
time by checking `Capacitor.isNativePlatform()`:

- **In a plain browser** (this includes the shared `dist/sightlines.html`
  preview): both fall back to the original simulated flow — a fake bottom
  banner, a timed fake interstitial/rewarded modal, `console.log` for
  events. Nothing about that path changed; it's still how you play-test in
  a browser.
- **Inside the native Capacitor shell**: real calls go out. Every hint
  request plays a real rewarded ad; every level completion (from the 2nd
  on) plays a real interstitial; a real adaptive banner sits at the bottom
  of the screen.

**The native plugins are reached without a bundler.** Capacitor auto-
registers every native plugin as a callable JS proxy, but the *documented*
way to get that proxy in code is `import { AdMob } from
'@capacitor-community/admob'` — and the rest of this app deliberately has
no bundler, no imports, just plain `<script>` tags on a `window.SL`
namespace. Rather than restructure the whole app around a bundler for two
plugins, `native-bridge/src/index.js` is the *one* file that imports
anything, and it's compiled once with esbuild into a plain script:

```
npm run build:native-bridge   # native-bridge/src/index.js -> webapp/js/native-bridge.js
```

That output is checked in (`webapp/js/native-bridge.js`, ~150KB) and loaded
first in `index.html`, exposing `window.SL_NATIVE = {AdMob, FirebaseAnalytics,
BannerAdSize, BannerAdPosition}`. `js/ads.js`/`js/analytics.js` just check
whether that object exists and whether `Capacitor.isNativePlatform()` is
true; in a browser tab it's always false, so behaviour there is provably
unchanged (see "Testing performed" below). Re-run the build command above
only if you upgrade either plugin or change what the bridge exposes.

**`TEST_MODE` in `js/ads.js`** (currently `true`) forces every native ad
request onto Google's public test ad unit IDs, regardless of the real IDs
staged in `admob/README.md` — so nothing can serve a real ad, or get your
AdMob account flagged for your own testing clicks, until someone
deliberately flips it to `false` for a release build. See
`admob/README.md` for the exact IDs in play.

Interstitials are gated to level *completion* only, never mid-solve — the
cadence spec (silent on level 1, fires from level 2 on) lives in
`maybeInterstitial()` in `js/ads.js`, unchanged from the simulated version.

**Firebase Analytics** forwards through the same
`SL.Analytics.log(name, params)` every screen already called — natively it
also calls `FirebaseAnalytics.logEvent({name, params})`, with boolean
params coerced to `0`/`1` first (GA4 event params are string/long/double
only; there's no native boolean type, so passing one through unsanitised
would either be silently dropped or mis-typed by the native bridge).

**Crash reporting and performance** (`js/diagnostics.js`, `SL.Diagnostics`)
wire in `@capacitor-firebase/crashlytics` and `@capacitor-firebase/performance`,
real and enabled, not simulated:

- A global `window.addEventListener('error'/'unhandledrejection', ...)`
  forwards every uncaught JS error to `FirebaseCrashlytics.recordException()`.
  This is necessary specifically *because* this app's logic runs as
  JavaScript inside a WebView: Crashlytics's automatic collection only
  catches a **native** (Java/Kotlin) fatal crash. A JS exception here
  doesn't crash the native process — the WebView can sit on a broken screen
  with Crashlytics seeing nothing at all — unless it's explicitly forwarded
  as a non-fatal report, which is what this does.
- One custom Performance trace, `level_solve`, starts when a level's timer
  starts and stops on completion, tagged with `section` and `tag`
  attributes so the Firebase Performance dashboard can break solve times
  down by chapter and by miniboss/boss. It's a single shared trace name
  across all 33 levels (not one name per level) so Performance aggregates
  it statistically instead of fragmenting into 33 separate trace names.
- An abandoned level (backed out of before solving) still stops its trace
  on `unmount()`, so the next level opened always gets a fresh one — this
  was an actual bug caught and fixed during testing: without that cleanup,
  a level left mid-solve would permanently block every later trace from
  ever starting again, since the "trace already active" flag never cleared.

Native wiring: both plugins needed their Gradle plugin applied at the app
module level (`android/app/build.gradle`, gated on the same
`google-services.json` check as Google Services) in addition to the plugin
classpaths in the root `android/build.gradle` — the Capacitor plugin
modules ship the underlying Firebase SDK dependency but not this build-time
instrumentation step. **The exact Gradle plugin versions pinned there were
not verified against Maven Central** — this sandbox's network policy blocks
that too, the same as `dl.google.com` and `support.google.com` earlier — so
the GitHub Actions build (see "Building the app for real") is what actually
proves they resolve, the same way it proved the AdMob/Analytics wiring
compiles.

Events firing today: `app_open`, `screen_open`, `level_start`,
`level_complete`, `hint_declined`, `hint_granted`, `tutorial_step`,
`tutorial_completed`, `section_barrier_skip_tapped/cancelled`,
`section_unlocked`, `settings_sound_toggled`, plus the ad lifecycle events
(`interstitial_requested/shown/dismissed/failed_to_load`,
`rewarded_ad_requested/shown/completed/skipped/failed_to_load`). (Screen
tracking uses the custom name `screen_open` rather than GA4's reserved
`screen_view`, which has its own expected shape.)

**Verified without a real device.** This sandbox has no Android SDK, so the
native path can't be proven on an actual phone from here — but its logic
was exercised against a scripted mock of the native plugin (fake
`AdMob`/`FirebaseAnalytics` objects standing in for the real native
bridge): confirmed the banner/interstitial/rewarded calls fire with the
correct test ad unit IDs and `isTesting: true`; confirmed interstitial
completion correctly waits for the native `Dismissed` event rather than
resolving as soon as `showInterstitial()` is called; confirmed the
rewarded flow only grants a hint when the native `Rewarded` event actually
fires, not just on any dismissal; confirmed boolean event params arrive at
`FirebaseAnalytics.logEvent` as `0`/`1`. What's still unverified is
everything below the JS boundary — whether the Gradle build actually
compiles, whether the manifest/plugin wiring is complete — see "Building
the app for real" below.

## Building the app for real

This sandbox has Node, npm and Java, but no Android SDK — so the first real
build has to happen in Android Studio (which handles first-time SDK setup
itself) or CI. From a checkout of this repo:

```
npm install
npm run build:native-bridge     # only needed after changing native-bridge/src
npx cap sync android            # copies webapp/ into the native project, re-links plugins
```

Then either open `android/` in Android Studio and hit Run, or from a
machine with the Android SDK installed:

```
cd android && ./gradlew assembleDebug
```

`android/app/google-services.json` and the AdMob App ID in
`android/app/src/main/res/values/strings.xml` are already in place — no
credentials to add before that first build.

## Where things stand

1. **Package name — locked in:** `com.lowpolyllamas.chessdoku`.
2. **Firebase — done and wired.** Project `chessdoku-252ca`; see `firebase/README.md`.
3. **AdMob — done and wired**, behind `TEST_MODE = true`; see `admob/README.md`.
4. **Native Android project — scaffolded** (`android/`), both plugins
   installed and synced, manifest/Gradle config in place.
5. **Not done yet, and can't be from this sandbox:** an actual compiled,
   installed, running build on a device or emulator. That's the next real
   milestone — see "Building the app for real" above. Once you've run it
   once, the two things worth checking first are that the bottom banner
   shows a real Google test-ad creative (not the "Advertisement" bar
   placeholder from the browser preview) and that the console/logcat shows
   `[analytics]` lines alongside real Firebase Analytics DebugView events.
6. Play Console still isn't needed for any of this — only once you're
   ready to upload a build to an internal testing track.

## Scope cuts made for this slice (flag if you want them back)

- No pencil-mark / candidate overlay in this build (it existed in the
  earlier single-level prototype). Cut to keep the mobile UI uncluttered;
  easy to bring back as a settings toggle.
- No "reveal solution" button — felt wrong next to a rewarded-ad hint
  economy. The only way to see the answer now is to solve it or hint
  through it.
- No replay-tutorial option in settings; it's gated to show once, ever
  (tracked in local storage).
- Saga map node connectors are straight vertical lines regardless of a
  node's left/center/right lane offset, so the path doesn't visually bend
  into each node — a cosmetic simplification, not a functional one.
- No app icon / splash / store graphics — those are Play Console assets,
  out of scope for a code vertical slice.

## Testing performed

Full Playwright pass against both `webapp/` (served locally) and the
bundled `dist/sightlines.html` (loaded via `file://`, matching how a
Capacitor WebView would load it): saga map renders all 33 nodes across 4
chapters with correct lock states; the tutorial's guided taps (cell, then
piece) gate correctly and only fire once ever; a full solve reaches the
victory state and records progress; the interstitial cadence matches the
spec exactly (silent after level 1, shown after level 2 and onward);
rewarded-ad decline vs. completion correctly gates the hint; the exact
skip-ahead scenario from the spec (mid-chapter, jump to the next chapter,
left-behind levels stay locked, both branches remain playable) passes;
boss levels show the boss sub-label and "Boss defeated" victory title; dark
theme and a 390px mobile viewport render without horizontal overflow.
