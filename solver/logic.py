"""Human-style logical solver: propagation only, no guessing.

Techniques, in the order a player would reach for them:
  T1 naked single    - one piece left that can legally go in a cell
  T2 hidden single   - one cell left in a row/col/box that can take a piece
  T3 vision sweep    - a placed piece erases its own type from every cell it sees
                       (applied automatically on every placement)
  T4 vision pointing - a piece is confined to a few cells inside one unit;
                       every cell that ALL of those cells attack cannot hold it
  T5 line/box lock   - a piece's candidates inside a box all sit on one row or
                       column (or vice versa) -> erase it from the rest of that line
"""
from chess_sudoku import Board, conflict_masks, PIECES


class Logic:
    def __init__(self, board, mode="xray", pawn="diag"):
        self.b = board
        self.conf = conflict_masks(board, mode, pawn)
        b = board
        self.rows = [[b.idx[(r, c)] for c in range(b.W)] for r in range(b.H)]
        self.cols = [[b.idx[(r, c)] for r in range(b.H)] for c in range(b.W)]
        self.boxes = [[i for i in range(b.N) if b.box_of[i] == k]
                      for k in range(b.nbox)]
        self.units = self.rows + self.cols + self.boxes
        self.unit_of = [[] for _ in range(b.N)]
        for u, cells in enumerate(self.units):
            for i in cells:
                self.unit_of[i].append(u)

    # ------------------------------------------------------------------
    def solve(self, givens, max_tech=5, trace=False):
        b = self.b
        cand = [set(b.pieces) for _ in range(b.N)]
        grid = [None] * b.N
        used = {t: 0 for t in ("T1", "T2", "T4", "T5")}
        log = []

        def assign(i, p, tech=None):
            if grid[i] == p:
                return True
            if p not in cand[i] or grid[i] is not None:
                return False
            grid[i] = p
            cand[i] = {p}
            for u in self.unit_of[i]:
                for j in self.units[u]:
                    if j != i:
                        cand[j].discard(p)
            m = self.conf[p][i]
            for j in range(b.N):
                if (m >> j) & 1:
                    cand[j].discard(p)
            if tech:
                used[tech] += 1
                if trace:
                    log.append((tech, i, p))
            return True

        for i, p in givens.items():
            if not assign(i, p):
                return None, used, log

        while True:
            if any(not cand[i] for i in range(b.N)):
                return None, used, log
            if all(grid[i] for i in range(b.N)):
                return grid, used, log

            # T1 naked single
            hit = False
            for i in range(b.N):
                if grid[i] is None and len(cand[i]) == 1:
                    assign(i, next(iter(cand[i])), "T1")
                    hit = True
            if hit:
                continue

            # T2 hidden single
            for cells in self.units:
                if len(cells) < len(b.pieces):
                    continue                      # partial unit: piece may be absent
                for p in b.pieces:
                    spots = [i for i in cells if p in cand[i]]
                    if not spots:
                        return None, used, log
                    if len(spots) == 1 and grid[spots[0]] is None:
                        assign(spots[0], p, "T2")
                        hit = True
            if hit:
                continue
            if max_tech < 4:
                break

            # T4 vision pointing
            for cells in self.units:
                for p in b.pieces:
                    spots = [i for i in cells if p in cand[i] and grid[i] is None]
                    if len(spots) < 2:
                        continue
                    if any(grid[i] == p for i in cells):
                        continue
                    m = self.conf[p][spots[0]]
                    for i in spots[1:]:
                        m &= self.conf[p][i]
                    if not m:
                        continue
                    for j in range(b.N):
                        if (m >> j) & 1 and grid[j] is None and p in cand[j]:
                            cand[j].discard(p)
                            used["T4"] += 1
                            if trace:
                                log.append(("T4", j, p))
                            hit = True
            if hit:
                continue
            if max_tech < 5:
                break

            # T5 line/box lock
            for group_a, group_b in ((self.boxes, self.rows + self.cols),
                                     (self.rows + self.cols, self.boxes)):
                for cells in group_a:
                    for p in b.pieces:
                        spots = [i for i in cells if p in cand[i] and grid[i] is None]
                        if not spots or any(grid[i] == p for i in cells):
                            continue
                        for other in group_b:
                            so = set(other)
                            if set(spots) <= so:
                                for j in other:
                                    if j not in cells and grid[j] is None and p in cand[j]:
                                        cand[j].discard(p)
                                        used["T5"] += 1
                                        if trace:
                                            log.append(("T5", j, p))
                                        hit = True
            if not hit:
                break

        return ("stuck" if all(cand[i] for i in range(b.N)) else None), used, log
