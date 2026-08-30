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

## Screens & files (`webapp/`)

```
index.html          saga screen + game screen markup, both toggled by [hidden]
css/styles.css       all styling: theme tokens, board, saga map, modals, ads, tutorial
js/data.js           generated - SL.BOARD / SL.SECTIONS / SL.LEVELS
js/rules.js          board geometry + chess-sudoku rule engine (pure functions)
js/storage.js        progress persistence (localStorage today)
js/analytics.js      analytics choke point (console + in-memory log today)
js/ads.js            banner / interstitial / rewarded stubs (simulated today)
js/audio.js          WebAudio synthesised sound effects
js/game.js           board screen: render, two-tap placement, hints, tutorial, completion
js/saga.js           level-select map: lock state, chapters, barriers, skip modal
js/main.js           view router, boot sequence, toast helper
```

## Monetization (simulated, ready to wire up)

- **Banner**: a fixed bottom bar, shown on both screens.
- **Interstitial**: first fires once 2 levels are complete, then after every
  level after that (`SL.Ads.maybeInterstitial(totalCompleted)` — called once
  per level completion, right after the victory state is recorded and before
  the victory buttons appear).
- **Rewarded video**: every hint request goes through
  `SL.Ads.showRewarded()`. Declining (skip, available after 2s) grants
  nothing; watching the full simulated clip (5s) grants one hint from the
  same technique-aware hint engine used throughout development.

All three are real UI flows with real timing today, just backed by a fake
ad creative instead of a network SDK — so the cadence and UX can be judged
before any account exists. Every call site in the game goes through
`js/ads.js`; swapping in `@capacitor-community/admob` later means rewriting
the bodies of the functions in that one file; nothing elsewhere changes.
Read the comments at the top of `js/ads.js` for the exact swap points.

**Before shipping real ads**: interstitials mid-puzzle would be a mistake
for a deduction game — they're gated to level *completion* only, never
mid-solve, on purpose.

## Analytics (stubbed, ready to wire up)

Every event in the app goes through `SL.Analytics.log(name, params)` in
`js/analytics.js`, which currently logs to the console and an in-memory
ring buffer (inspect live via `SL.Analytics.history` in devtools). Events
firing today: `app_open`, `screen_view`, `level_start`, `level_complete`,
`hint_declined`, `hint_granted`, `tutorial_step`, `tutorial_completed`,
`section_barrier_skip_tapped/cancelled`, `section_unlocked`,
`settings_sound_toggled`, plus the ad lifecycle events
(`interstitial_requested/shown/dismissed`,
`rewarded_ad_requested/shown/completed/skipped`).

Read the comment at the top of `js/analytics.js` for the swap point to
Firebase Analytics.

## What you'll need to hand over next

Nothing was needed to build this slice — both integrations are fully
simulated. To make them real:

1. **Package name — locked in:** `com.lowpolyllamas.chessdoku`.
2. **Firebase — done.** Project `chessdoku-252ca`, Android app registered,
   `google-services.json` received and staged at `firebase/google-services.json`
   (see `firebase/README.md`).
3. **AdMob — in progress.** Need: the app's AdMob App ID, plus three ad unit
   IDs (banner, interstitial, rewarded), all under the same package name.
4. Both land for real as part of standing up the actual Capacitor project
   (`npx cap add android`) — that's the next milestone once AdMob's IDs are
   in hand, since ad/analytics *plugins* only function inside a native
   shell, not a plain browser tab. `google-services.json` moves into
   `android/app/` at that point.

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
