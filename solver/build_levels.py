"""Generate a varied level set, classify by hardest technique needed, verify."""
import random, json
from chess_sudoku import Board, Solver, render, PIECES, conflict_masks
from logic import Logic

b = Board.regular(6, 6, 2, 3)
S, L = Solver(b), Logic(b)
CONF = conflict_masks(b, "xray", "diag")

def hardest(givens, sol):
    for cap, name in ((2, "singles only"), (4, "vision pointing"), (5, "line/box lock")):
        g, used, _ = L.solve(dict(givens), max_tech=cap)
        if g == sol:
            return cap, name, used
    return None, None, None

def carve(tier_cap, seed):
    rnd = random.Random(seed)
    sol = S.solve(limit=1, shuffle=True, seed=seed)[0]
    givens = {i: sol[i] for i in range(b.N)}
    order = list(range(b.N)); rnd.shuffle(order)
    for i in order:
        p = givens.pop(i)
        g, _, _ = L.solve(dict(givens), max_tech=tier_cap)
        if g != sol:
            givens[i] = p
    return givens, sol

def verify(givens, sol):
    """independent re-check of everything we claim"""
    errs = []
    for i, p in givens.items():
        if sol[i] != p: errs.append("given disagrees with solution")
    for cells, what in ([(u, "unit") for u in L.units]):
        seen = [sol[i] for i in cells]
        if len(set(seen)) != len(seen): errs.append(f"duplicate in {what}")
    for i in range(b.N):
        p = sol[i]
        m = CONF[p][i]
        for j in range(b.N):
            if (m >> j) & 1 and sol[j] == p:
                errs.append(f"{p} at {b.cells[i]} sees {p} at {b.cells[j]}")
    n = len(S.solve(givens=dict(givens), limit=3))
    if n != 1: errs.append(f"{n} solutions, not unique")
    return errs

pool = {}
for cap in (2, 4, 5):
    for seed in range(40):
        givens, sol = carve(cap, seed)
        if len(S.solve(givens=dict(givens), limit=2)) != 1:
            continue
        hc, name, used = hardest(givens, sol)
        if hc is None: continue
        key = (hc, len(givens))
        if key not in pool or seed % 7 == 0:
            pool.setdefault(key, (givens, sol, name, used))

print("available (hardest technique, clue count):")
for k in sorted(pool): print("  ", k[0], "clues=", k[1])

levels = []
def take(cap, maxclues, title, blurb):
    best = None
    for (hc, n), v in sorted(pool.items()):
        if hc == cap and n <= maxclues and (best is None or n > best[0][1]):
            best = ((hc, n), v)
    if not best:
        for (hc, n), v in sorted(pool.items()):
            if hc == cap and (best is None or n < best[0][1]): best = ((hc, n), v)
    (hc, n), (givens, sol, name, used) = best
    errs = verify(givens, sol)
    print(f"\n{title}: {n} clues, hardest technique = {name}, verify = "
          f"{'CLEAN' if not errs else errs}")
    print(render(b, [givens.get(i) for i in range(b.N)], givens))
    levels.append({"id": title.lower().replace(" ", "-"), "name": title,
                   "blurb": blurb, "technique": name, "clues": n,
                   "givens": {str(k): v for k, v in givens.items()},
                   "solution": sol})

take(2, 99, "Opening",  "Every step is a single: some cell or some piece has only one home left.")
take(4, 99, "Middlegame", "Needs the vision squeeze: a piece confined to a few cells still rules out squares.")
take(5, 99, "Endgame", "Sparse. Chains a line/box lock together with the vision squeeze.")

json.dump({"board": {"H": b.H, "W": b.W, "boxes": b.boxes}, "levels": levels},
          open("levels.json", "w"), indent=1)
print("\nwrote levels.json with", len(levels), "levels")
