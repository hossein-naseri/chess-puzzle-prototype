"""
Builds the 33-level vertical-slice saga: 3 onboarding levels (Roman numerals)
+ 10 earlygame + 10 midgame + 10 endgame (Latin numerals, restarting at 1).

Every level is independently verified: unique solution, no unit repeats, no
piece sees its own twin, and reachable by pure propagation (Logic.solve) at
the level's declared technique cap - reaching a full grid by propagation
alone is itself a proof of uniqueness, since every placement was forced.

Run: python3 build_saga.py   ->  writes saga.json and ../webapp/js/data.js
"""
import json, os, random
from chess_sudoku import Board, Solver, conflict_masks, PIECES, NAMES
from logic import Logic

B = Board.regular(6, 6, 2, 3)
SOLVER = Solver(B)
LOGIC = Logic(B)
CONF = conflict_masks(B, "xray", "diag")

ALL_GRIDS = SOLVER.solve(limit=300)          # all 112 valid grids
assert len(ALL_GRIDS) == 112, len(ALL_GRIDS)

ROMAN = {1: "I", 2: "II", 3: "III"}

TECH_NAME = {2: "singles only", 4: "vision pointing", 5: "line/box lock"}

def carve_to(sol, cap, target, want_knight, rnd, tries=30):
    best = None
    for _ in range(tries):
        order = list(range(36))
        rnd.shuffle(order)
        if want_knight:
            order.sort(key=lambda i: 0 if sol[i] != "N" else 1)   # remove non-knights first
        givens = {i: sol[i] for i in range(36)}
        for i in order:
            if len(givens) <= target:
                break
            p = givens.pop(i)
            g, _, _ = LOGIC.solve(dict(givens), max_tech=cap)
            if g != sol:
                givens[i] = p
        n = len(givens)
        knight_ok = (not want_knight) or any(v == "N" for v in givens.values())
        score = (0 if knight_ok else 1, abs(n - target))
        if best is None or score < best[0]:
            best = (score, dict(givens), n, knight_ok)
    return best[1], best[2], best[3]

def verify(givens, sol, cap):
    errs = []
    for i, p in givens.items():
        if sol[i] != p: errs.append("clue disagrees with solution")
    for cells in LOGIC.units:
        seen = [sol[i] for i in cells]
        if len(set(seen)) != len(seen): errs.append("duplicate piece in a unit")
    for i in range(36):
        m = CONF[sol[i]][i]
        for j in range(36):
            if (m >> j) & 1 and sol[j] == sol[i]:
                errs.append(f"{sol[i]} at {i} sees its own twin at {j}")
    if len(SOLVER.solve(givens=dict(givens), limit=2)) != 1:
        errs.append("not a unique solution")
    g, _, _ = LOGIC.solve(dict(givens), max_tech=cap)
    if g != sol:
        errs.append(f"not solvable by pure logic at cap {cap}")
    return errs

# ---------------------------------------------------------------------------
# level specification: (section, local#, cap, target clues, want knight, tag)
# ---------------------------------------------------------------------------
SPECS = []
SPECS += [("onboarding", 1, 2, 16, True,  "tutorial"),
          ("onboarding", 2, 2, 13, True,  None),
          ("onboarding", 3, 2, 11, False, None)]
SPECS += [("earlygame", 1, 2, 10, True,  None),
          ("earlygame", 2, 2, 10, True,  None),
          ("earlygame", 3, 2,  9, True,  None),
          ("earlygame", 4, 2,  9, False, None),
          ("earlygame", 5, 4,  7, False, "miniboss"),
          ("earlygame", 6, 2,  8, False, None),
          ("earlygame", 7, 2,  8, False, None),
          ("earlygame", 8, 2,  7, False, None),
          ("earlygame", 9, 2,  7, False, None),
          ("earlygame",10, 4,  6, False, "boss")]
SPECS += [("midgame", 1, 4, 7, False, None),
          ("midgame", 2, 4, 7, False, None),
          ("midgame", 3, 4, 6, False, None),
          ("midgame", 4, 4, 6, False, None),
          ("midgame", 5, 5, 5, False, "miniboss"),
          ("midgame", 6, 4, 6, False, None),
          ("midgame", 7, 4, 5, False, None),
          ("midgame", 8, 4, 5, False, None),
          ("midgame", 9, 4, 5, False, None),
          ("midgame",10, 5, 4, False, "boss")]
SPECS += [("endgame", 1, 5, 6, False, None),
          ("endgame", 2, 5, 6, False, None),
          ("endgame", 3, 5, 5, False, None),
          ("endgame", 4, 5, 5, False, None),
          ("endgame", 5, 5, 4, False, "miniboss"),
          ("endgame", 6, 5, 5, False, None),
          ("endgame", 7, 5, 5, False, None),
          ("endgame", 8, 5, 4, False, None),
          ("endgame", 9, 5, 4, False, None),
          ("endgame",10, 5, 3, False, "boss")]

assert len(SPECS) == 33

SECTION_META = {
    "onboarding": {"name": "Prologue",      "roman": True},
    "earlygame":  {"name": "The Open Game", "roman": False},
    "midgame":    {"name": "The Middlegame","roman": False},
    "endgame":    {"name": "The Endgame",   "roman": False},
}

BLURB = {
    2: "Every step is a single: some cell or some piece has only one home left.",
    4: "A piece confined to a few cells still rules out squares elsewhere - the vision squeeze.",
    5: "Chains a line/box lock together with the vision squeeze. Nothing spare.",
}

def main():
    rnd = random.Random(20260829)
    grid_order = list(range(len(ALL_GRIDS)))
    rnd.shuffle(grid_order)
    grid_cursor = 0
    used_givens = set()
    levels = []
    warnings = []

    for section, local, cap, target, want_knight, tag in SPECS:
        chosen = None
        for attempt in range(12):
            gi = grid_order[grid_cursor % len(grid_order)]
            grid_cursor += 1
            sol = ALL_GRIDS[gi]
            givens, n, knight_ok = carve_to(sol, cap, target, want_knight, rnd)
            key = frozenset(givens.items())
            if key in used_givens:
                continue
            errs = verify(givens, sol, cap)
            if errs:
                continue
            if want_knight and not knight_ok:
                if attempt < 10:
                    continue        # keep trying other grids
                warnings.append(f"{section} {local}: could not seat a knight clue")
            chosen = (sol, givens, n, knight_ok)
            used_givens.add(key)
            break
        if chosen is None:
            raise RuntimeError(f"failed to build {section} {local}")
        sol, givens, n, knight_ok = chosen

        label = ROMAN[local] if SECTION_META[section]["roman"] else str(local)
        lvl_id = f"{section[:2]}-{local}"
        blurb = BLURB[cap]
        if tag == "miniboss": blurb = "Miniboss. " + blurb
        if tag == "boss": blurb = "Boss. " + blurb

        levels.append({
            "id": lvl_id, "section": section, "local": local, "label": label,
            "tag": tag, "tutorial": tag == "tutorial",
            "technique": TECH_NAME[cap], "clues": n, "hasKnightClue": knight_ok,
            "blurb": blurb,
            "givens": {str(k): v for k, v in givens.items()},
            "solution": sol,
        })
        print(f"{section:10s} {label:>4s}  cap={cap} clues={n:2d} "
              f"knight={'Y' if knight_ok else '.'} tag={tag or '-'}")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings: print(" ", w)

    out = {"board": {"H": B.H, "W": B.W, "boxes": B.boxes},
           "sections": SECTION_META, "levels": levels}

    here = os.path.dirname(__file__)
    json.dump(out, open(os.path.join(here, "saga.json"), "w"), indent=1)

    webapp_js = os.path.join(here, "..", "webapp", "js")
    os.makedirs(webapp_js, exist_ok=True)
    with open(os.path.join(webapp_js, "data.js"), "w") as f:
        f.write("// Generated by solver/build_saga.py - do not hand-edit.\n")
        f.write("window.SL = window.SL || {};\n")
        f.write("SL.BOARD = " + json.dumps(out["board"]) + ";\n")
        f.write("SL.SECTIONS = " + json.dumps(out["sections"]) + ";\n")
        f.write("SL.LEVELS = " + json.dumps(out["levels"]) + ";\n")

    print(f"\nwrote saga.json and webapp/js/data.js with {len(levels)} levels")
    print(f"distinct base grids used: {len(set(grid_order[:grid_cursor]))} attempts over {grid_cursor} draws")

if __name__ == "__main__":
    main()
