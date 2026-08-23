"""Carve unique, logically-solvable levels out of a full solution."""
import random, json, sys
from chess_sudoku import Board, Solver, render, PIECES
from logic import Logic

TIERS = {"easy": 2, "medium": 4, "hard": 5}

def carve(board, tier, seed, rounds=40):
    s, L = Solver(board), Logic(board)
    cap = TIERS[tier]
    rnd = random.Random(seed)
    best = None
    for _ in range(rounds):
        sol = s.solve(limit=1, shuffle=True, seed=rnd.randrange(10**9))[0]
        givens = {i: sol[i] for i in range(board.N)}
        order = list(range(board.N)); rnd.shuffle(order)
        for i in order:
            p = givens.pop(i)
            g, _, _ = L.solve(dict(givens), max_tech=cap)
            if g != sol:
                givens[i] = p
        if len(s.solve(givens=dict(givens), limit=2)) != 1:
            continue
        _, used, _ = L.solve(dict(givens), max_tech=cap)
        if best is None or len(givens) < len(best[0]):
            best = (dict(givens), sol, used)
    return best

if __name__ == "__main__":
    b = Board.regular(6, 6, 2, 3)
    out = {}
    for tier in ("easy", "medium", "hard"):
        counts = []
        pick = None
        for seed in range(4):
            r = carve(b, tier, seed, rounds=8)
            if not r: continue
            counts.append(len(r[0]))
            if pick is None or len(r[0]) < len(pick[0]):
                pick = r
        givens, sol, used = pick
        out[tier] = {"givens": {str(k): v for k, v in givens.items()}, "solution": sol}
        print(f"{tier:6s}: clues {sorted(counts)} -> chose {len(givens)}  techniques {used}")
        print(render(b, [givens.get(i) for i in range(b.N)], givens))
        print()
    json.dump(out, open("levels.json", "w"), indent=1)
    print("wrote levels.json")
