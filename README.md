# Sightlines — chess × sudoku

Fill a 6×6 board with the six chess pieces. Every row, column and 2×3 box holds all six
exactly once, **and** no piece may see another of its own kind along its chess movement.

- **`webapp/`** — the vertical slice: 33 levels across four saga-style chapters, onboarding
  tutorial, monetization and analytics stubs, synthesised sound. This is the real
  source — see **`SAGA.md`** for the full design/handoff notes, and point a Capacitor
  build at this folder directly.
- **`dist/sightlines.html`** — the same app bundled into one file, only so it can be shared
  as a single link. Regenerate with `python3 tools/bundle.py`; don't hand-edit it.
- **`index.html`** (repo root) — the original single-level prototype from before the
  vertical slice existed. Kept for history; superseded by `webapp/`.
- **`VALIDATION.md`** — does the core idea hold up at all? Solution counts, which piece
  rules actually constrain anything, rule variants tried.
- **`solver/`** — the engine behind all of it, including the 33-level generator.

```
python3 solver/validate.py       # reproduce every claim in VALIDATION.md
python3 solver/build_saga.py     # regenerate + verify the 33-level saga
python3 tools/bundle.py          # rebuild dist/sightlines.html from webapp/
```

| file | what it is |
|---|---|
| `solver/chess_sudoku.py` | board geometry, sight rules, exhaustive solver |
| `solver/logic.py` | human-technique solver — propagation only, never guesses |
| `solver/build_saga.py` | generates + verifies the 33-level saga → `webapp/js/data.js` |
| `solver/build_levels.py`, `validate.py` | the original 3-level prototype + feasibility study |
| `webapp/` | the vertical slice app — see `SAGA.md` |
| `tools/bundle.py` | inlines `webapp/` into `dist/sightlines.html` |

**Headline results:** 112 valid 6×6 grids; levels need only 4–16 clues depending on chapter;
the rook's sight rule is provably inert, and queen/bishop and king/pawn collapse onto
identical rules. See `VALIDATION.md` for the feasibility study and `SAGA.md` for the
vertical slice.
