import time
from chess_sudoku import *

def solver_boxes_only(board, mode="xray", pawn="diag"):
    s = Solver(board, mode, pawn)
    b = board
    s.peers = [(b.H+b.W+b.box_of[i],) for i in range(b.N)]   # boxes only
    return s

print("=== Variant B: NO row/col rule. Only 'each box holds all 6' + chess vision ===")
for label, board in (("6x6 (2x3 boxes)", Board.regular(6,6,2,3)),
                     ("6x4 (3x2 boxes)", Board.regular(6,4,3,2))):
    s = solver_boxes_only(board)
    t=time.time(); sols=s.solve(limit=300000); dt=time.time()-t
    print(f"  {label}: {len(sols)}{'+' if len(sols)>=300000 else ''} solutions ({dt:.1f}s)")
    if sols: print(render(board, sols[0]).replace("\n","\n     ").rjust(0))
    # which rules bite here?
    base=len(sols)
    if base < 300000:
        for p in PIECES:
            s2 = solver_boxes_only(board); s2.conf[p]=[0]*board.N
            n=len(s2.solve(limit=600000))
            print(f"     drop {NAMES[p]:7s}: {n:>7d} {'INERT' if n==base else ''}")
    print()
