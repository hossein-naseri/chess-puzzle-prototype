# Does the idea work? Yes — with one caveat worth knowing

Everything below is reproduced by `python3 solver/validate.py`.

## The rules as tested

**Sudoku half** — every row, column and box holds each of the six pieces exactly once.
**Chess half** — no piece may see another piece *of its own kind*, where sight follows how
that piece moves. Different pieces never interact.

Sight is **x-ray**: a bishop sees its whole diagonal regardless of what stands in between.
The alternative (blocked sight, as in real chess) is a dead end — see below.

## 1. Valid grids exist

| board | boxes | sight | complete grids |
|---|---|---|---|
| 6×6 | 2 tall × 3 wide | x-ray | **112** |
| 6×6 | 2 tall × 3 wide | blocked | 16,368 |
| 6×4 *(your sketch)* | 3 tall × 2 wide | x-ray | **17,048** |
| 6×4 *(your sketch)* | 3 tall × 2 wide | blocked | 64,560 |

Both boards work, so no irregular/jigsaw regions were needed. 6×6 is the better puzzle: only
112 grids satisfy everything, which is *tight* — deductions bite hard and levels need very few
clues. The 6×4 sketch works too, but a 4-cell row can only hold 4 of the 6 pieces, so rows are
a much weaker place to reason from.

**Blocked sight is the dead end.** The board ends up completely full, so a rook, bishop or queen
is always stopped by the piece immediately next to it. Every sliding piece collapses to "the
adjacent square only", which makes bishop, queen, king and pawn all the same piece. Solution
counts balloon and the puzzle goes mushy. Use x-ray.

## 2. The caveat: three of the six pieces carry no distinct rule

Turning off one piece's chess rule at a time, on the 6×6 board:

| rule switched off | grids | effect |
|---|---|---|
| Pawn | 392 | 3.5× looser |
| Knight | 1,456 | 13× looser |
| Bishop | 3,680 | 33× looser |
| **Rook** | **112** | **none — the rule forbids nothing** |
| Queen | 3,680 | 33× looser |
| King | 392 | 3.5× looser |

This is not a quirk of the board size, it is forced by the rules themselves:

- Rows and columns already ban a repeated piece. So **any orthogonal sight is free** — it can
  never rule out a square the sudoku rule hadn't ruled out already.
- The **rook** sees only orthogonally → its rule does nothing whatsoever.
- The **queen** = rook + bishop, and the rook half is free → she ends up with *exactly* the
  bishop's rule: no twin on a diagonal.
- The **king** sees eight neighbours, four of them orthogonal and free → he ends up with
  *exactly* the pawn's rule: no twin diagonally touching.

So six pieces, three real rules: **diagonal touch** (pawn, king), **diagonal line**
(bishop, queen), **knight's leap** (knight), and the rook as a free agent.

That is worth knowing but it is not fatal. It keeps the game very easy to teach, and the free
piece is a genuine design tool — the rook is the piece that falls into place last.

## 3. Fixes I tested, and what happened

| change | result |
|---|---|
| Drop the row/column rule; keep boxes + chess sight | 300,000+ grids. Every piece finally matters, but rows end up holding two pawns and no bishop — it stops looking like a sudoku. **Rejected.** |
| Rook → elephant (leaps exactly 2 diagonally, a real shatranj piece) | 16 grids. Works, and every piece then constrains something. |
| Rook → camel (1,3 leaper) | 64 grids. Works. |
| Queen → amazon (diagonals + knight moves) | **impossible** — no grid exists |
| King claims 2 squares of space | **impossible** — no grid exists |

Only a *leaper* can rescue the rook, because a leaper is the one thing rows and columns don't
already cover. Nothing rescues queen-vs-bishop or king-vs-pawn while the sudoku rule stands.

## 4. The shipped levels

Carved from a full grid by removing clues while the puzzle stayed both uniquely solvable **and**
solvable by pure logic — no guessing, ever.

| level | clues | hardest technique needed | verified |
|---|---|---|---|
| Opening | 8 | singles only | unique + logical |
| Middlegame | 7 | vision pointing | unique + logical |
| Endgame | 5 | line/box lock | unique + logical |

Each is independently re-checked: clues agree with the solution, no unit repeats, no piece sees
its twin, exactly one solution exists, and the technique-limited solver reaches that solution
without a single guess.

The techniques the generator allows a player to need:

1. **Naked single** — one piece still fits a square.
2. **Hidden single** — one square still fits a piece, within some row, column or box.
3. **Vision sweep** — a placed piece erases its own kind from everything it sees.
4. **Vision pointing** — a piece is confined to a few squares in one box; every square that
   *all* of those attack is closed to it. This one is unique to this game and is its best trick.
5. **Line/box lock** — a piece's remaining squares in a box all sit on one line, so it leaves
   the rest of that line.

Five clues is remarkably sparse for a 36-square grid — a consequence of only 112 grids existing.
