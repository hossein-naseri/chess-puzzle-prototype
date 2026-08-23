"""
Chess-Sudoku feasibility engine.

Rules under test
----------------
Sudoku layer : every row / column / box holds no duplicate piece.
               (On a unit with as many cells as there are piece types,
                that means each piece appears exactly once.)
Chess  layer : two pieces OF THE SAME TYPE may not "see" each other,
               where sight follows how the piece moves in chess.

Sight modes
-----------
xray    : sliding pieces (R,B,Q) see all the way down their lines,
          ignoring the pieces standing in between.
blocked : sliding pieces stop at the first occupied cell (classic chess).
          On a fully packed board that collapses every slider to
          "adjacent cell only".

Pawn modes
----------
diag    : a pawn sees all four diagonal neighbours.
forward : a pawn sees the two diagonal cells "up" the board.
          Sight is treated as symmetric (a conflict if EITHER sees
          the other), so the closure of `forward` equals `diag`
          unless directed=True.
"""

import random
from itertools import combinations

PIECES = "PNBRQK"                      # pawn knight bishop rook queen king
NAMES  = {"P": "Pawn", "N": "Knight", "B": "Bishop",
          "R": "Rook", "Q": "Queen",  "K": "King"}


# --------------------------------------------------------------------------
# board geometry
# --------------------------------------------------------------------------
class Board:
    """H rows x W cols, plus a box id per cell."""

    def __init__(self, H, W, boxes, pieces=PIECES):
        self.H, self.W = H, W
        self.boxes = boxes                       # boxes[r][c] -> box id
        self.pieces = pieces
        self.N = H * W
        self.cells = [(r, c) for r in range(H) for c in range(W)]
        self.idx = {rc: i for i, rc in enumerate(self.cells)}
        self.nbox = max(max(row) for row in boxes) + 1
        self.box_of = [boxes[r][c] for r, c in self.cells]
        self.row_of = [r for r, c in self.cells]
        self.col_of = [c for r, c in self.cells]

    @staticmethod
    def regular(H, W, bh, bw, pieces=PIECES):
        """Rectangular boxes bh tall x bw wide."""
        assert H % bh == 0 and W % bw == 0
        per_row = W // bw
        boxes = [[(r // bh) * per_row + (c // bw) for c in range(W)]
                 for r in range(H)]
        return Board(H, W, boxes, pieces)

    def unit_cells(self):
        """All rows, columns and boxes as lists of cell indices."""
        units = []
        for r in range(self.H):
            units.append([self.idx[(r, c)] for c in range(self.W)])
        for c in range(self.W):
            units.append([self.idx[(r, c)] for r in range(self.H)])
        for b in range(self.nbox):
            units.append([i for i in range(self.N) if self.box_of[i] == b])
        return units


# --------------------------------------------------------------------------
# sight
# --------------------------------------------------------------------------
def sees(piece, r1, c1, r2, c2, mode="xray", pawn="diag"):
    dr, dc = r2 - r1, c2 - c1
    adr, adc = abs(dr), abs(dc)
    if dr == 0 and dc == 0:
        return False

    if piece == "N":
        return {adr, adc} == {1, 2}
    if piece == "K":
        return max(adr, adc) == 1
    if piece == "P":
        if pawn == "diag":
            return adr == 1 and adc == 1
        # forward-capture, symmetric closure -> still all four diagonals
        return adr == 1 and adc == 1

    # sliders
    ortho = (dr == 0 or dc == 0)
    diag  = (adr == adc)
    if piece == "R":
        line = ortho
    elif piece == "B":
        line = diag
    else:                                        # Q
        line = ortho or diag
    if not line:
        return False
    if mode == "xray":
        return True
    # blocked: on a fully packed board only the neighbouring cell is visible
    return max(adr, adc) == 1


def conflict_masks(board, mode="xray", pawn="diag"):
    """conf[piece][cell] -> bitmask of cells that same-type piece may not occupy."""
    conf = {}
    for p in board.pieces:
        per_cell = []
        for i, (r1, c1) in enumerate(board.cells):
            m = 0
            for j, (r2, c2) in enumerate(board.cells):
                if i != j and (sees(p, r1, c1, r2, c2, mode, pawn) or
                               sees(p, r2, c2, r1, c1, mode, pawn)):
                    m |= 1 << j
            per_cell.append(m)
        conf[p] = per_cell
    return conf


# --------------------------------------------------------------------------
# solver
# --------------------------------------------------------------------------
class Solver:
    def __init__(self, board, mode="xray", pawn="diag"):
        self.b = board
        self.mode, self.pawn = mode, pawn
        self.conf = conflict_masks(board, mode, pawn)
        self.pi = {p: k for k, p in enumerate(board.pieces)}
        self.np = len(board.pieces)
        b = board
        self.peers = []                          # row/col/box unit ids per cell
        for i in range(b.N):
            self.peers.append((b.row_of[i], b.H + b.col_of[i],
                               b.H + b.W + b.box_of[i]))
        self.nunits = b.H + b.W + b.nbox

    def solve(self, givens=None, limit=2, shuffle=False, seed=None):
        """givens: dict cell_index -> piece. Returns up to `limit` solutions."""
        b = self.b
        givens = givens or {}
        rnd = random.Random(seed)
        used = [0] * self.nunits                 # bitmask of pieces used per unit
        placed = {p: 0 for p in b.pieces}        # bitmask of cells per piece
        grid = [None] * b.N
        out = []

        def can(i, p):
            bit = 1 << self.pi[p]
            for u in self.peers[i]:
                if used[u] & bit:
                    return False
            return not (placed[p] & self.conf[p][i])

        def put(i, p):
            bit = 1 << self.pi[p]
            for u in self.peers[i]:
                used[u] |= bit
            placed[p] |= 1 << i
            grid[i] = p

        def pop(i, p):
            bit = 1 << self.pi[p]
            for u in self.peers[i]:
                used[u] &= ~bit
            placed[p] &= ~(1 << i)
            grid[i] = None

        for i, p in givens.items():
            if not can(i, p):
                return []
            put(i, p)

        def rec():
            if len(out) >= limit:
                return
            # MRV
            best, best_opts = -1, None
            for i in range(b.N):
                if grid[i] is not None:
                    continue
                opts = [p for p in b.pieces if can(i, p)]
                if not opts:
                    return
                if best_opts is None or len(opts) < len(best_opts):
                    best, best_opts = i, opts
                    if len(opts) == 1:
                        break
            if best_opts is None:
                out.append(grid.copy())
                return
            if shuffle:
                rnd.shuffle(best_opts)
            for p in best_opts:
                put(best, p)
                rec()
                pop(best, p)
                if len(out) >= limit:
                    return

        rec()
        return out


# --------------------------------------------------------------------------
# human-style logical solver (for rating a puzzle)
# --------------------------------------------------------------------------
class LogicSolver:
    """Propagation only: no guessing. Techniques:
       1. vision + unit elimination
       2. naked single
       3. hidden single (a piece with one remaining cell in a unit)
    """

    def __init__(self, board, mode="xray", pawn="diag"):
        self.b = board
        self.conf = conflict_masks(board, mode, pawn)
        self.units = board.unit_cells()
        self.unit_of = [[] for _ in range(board.N)]
        for u, cells in enumerate(self.units):
            for i in cells:
                self.unit_of[i].append(u)

    def solve(self, givens):
        b = self.b
        cand = [set(b.pieces) for _ in range(b.N)]
        grid = [None] * b.N
        steps = {"naked": 0, "hidden": 0}

        def assign(i, p):
            if grid[i] == p:
                return True
            if p not in cand[i]:
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
            return True

        for i, p in givens.items():
            if not assign(i, p):
                return None, steps

        progress = True
        while progress:
            progress = False
            for i in range(b.N):
                if grid[i] is None:
                    if not cand[i]:
                        return None, steps
                    if len(cand[i]) == 1:
                        assign(i, next(iter(cand[i])))
                        steps["naked"] += 1
                        progress = True
            for cells in self.units:
                for p in b.pieces:
                    spots = [i for i in cells if p in cand[i]]
                    if len(spots) == 1 and grid[spots[0]] is None:
                        assign(spots[0], p)
                        steps["hidden"] += 1
                        progress = True
                    elif not spots and any(grid[i] == p for i in cells) is False:
                        # piece has nowhere to go in a unit that needs it
                        if len(cells) >= len(b.pieces):
                            return None, steps
        if all(g is not None for g in grid):
            return grid, steps
        return "stuck", steps


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def render(board, grid, givens=None):
    givens = givens or {}
    lines = []
    for r in range(board.H):
        row = []
        for c in range(board.W):
            i = board.idx[(r, c)]
            g = grid[i] if grid[i] else "."
            row.append(f"[{g}]" if i in givens else f" {g} ")
        lines.append("".join(row))
    return "\n".join(lines)


def describe(board):
    return f"{board.H}x{board.W} ({board.N} cells, {board.nbox} boxes)"
