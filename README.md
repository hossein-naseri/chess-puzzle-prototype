# Sightlines — chess × sudoku prototype

Fill a 6×6 board with the six chess pieces. Every row, column and 2×3 box holds all six
exactly once, **and** no piece may see another of its own kind along its chess movement.

- **`index.html`** — the playable prototype. Open it in a browser; no build, no dependencies.
  Three verified levels plus a sandbox, sight-line overlay, rule-break flagging, candidate
  marks, and a hint engine that explains its reasoning.
- **`VALIDATION.md`** — does the idea hold up? Solution counts, which piece rules actually
  constrain anything, rule variants tried, and how the levels were verified.
- **`solver/`** — the engine behind all of it.

```
python3 solver/validate.py       # reproduce every claim in VALIDATION.md
python3 solver/build_levels.py   # regenerate + verify levels.json
```

| file | what it is |
|---|---|
| `solver/chess_sudoku.py` | board geometry, sight rules, exhaustive solver |
| `solver/logic.py` | human-technique solver — propagation only, never guesses |
| `solver/build_levels.py` | carves unique, logically-solvable levels; verifies them |
| `solver/validate.py` | the feasibility study |
| `solver/levels.json` | the generated levels (also inlined into `index.html`) |

**Headline results:** 112 valid 6×6 grids; levels need only 5–8 clues; the rook's sight rule
is provably inert, and queen/bishop and king/pawn collapse onto identical rules. See
`VALIDATION.md`.
