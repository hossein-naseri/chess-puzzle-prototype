"""Reproduces every claim in ../VALIDATION.md. Run: python3 validate.py"""
import time
from chess_sudoku import Board, Solver, conflict_masks, render, PIECES, NAMES
from logic import Logic

CAP = 400000
def count(board, mode="xray", pawn="diag", drop=(), rowcol=True, rules=None, cap=CAP):
    s = Solver(board, mode, pawn)
    if rules: s.conf = custom(board, rules)
    for p in drop: s.conf[p] = [0]*board.N
    if not rowcol:
        s.peers = [(board.H+board.W+board.box_of[i],) for i in range(board.N)]
    t=time.time(); sols=s.solve(limit=cap)
    return len(sols), time.time()-t, sols

def custom(board, rules):
    conf={}
    for p in board.pieces:
        per=[]
        for i,(r1,c1) in enumerate(board.cells):
            m=0
            for j,(r2,c2) in enumerate(board.cells):
                if i!=j and rules[p](abs(r2-r1), abs(c2-c1)): m|=1<<j
            per.append(m)
        conf[p]=per
    return conf

STD={"P":lambda dr,dc:dr==1 and dc==1, "N":lambda dr,dc:{dr,dc}=={1,2},
     "B":lambda dr,dc:dr==dc, "R":lambda dr,dc:dr==0 or dc==0,
     "Q":lambda dr,dc:dr==dc or dr==0 or dc==0, "K":lambda dr,dc:max(dr,dc)==1}

def rule(t): print("\n" + t + "\n" + "-"*len(t))

B66 = Board.regular(6,6,2,3)     # classic square, 2 tall x 3 wide boxes
B64 = Board.regular(6,4,3,2)     # the board from the original sketch

rule("1. Does a valid grid exist at all?")
for name, b in (("6x6, 2x3 boxes", B66), ("6x4, 3x2 boxes (original sketch)", B64)):
    for mode in ("xray", "blocked"):
        n,dt,sols = count(b, mode)
        print(f"   {name:34s} sight={mode:8s} {n:>7d} solutions  ({dt:.1f}s)")

rule("2. Which piece rules actually constrain anything? (6x6, x-ray)")
base,_,_ = count(B66)
print(f"   all rules on: {base}")
for p in PIECES:
    n,_,_ = count(B66, drop=(p,))
    print(f"   without the {NAMES[p]:7s} rule: {n:>6d}   "
          f"{'INERT - the rule forbids nothing' if n==base else f'({n/base:.1f}x looser)'}")

rule("3. Why: rows+columns already ban a repeat, so orthogonal sight is free")
cf = conflict_masks(B66,"xray","diag")
line=[]
for i,(r1,c1) in enumerate(B66.cells):
    m=0
    for j,(r2,c2) in enumerate(B66.cells):
        if i!=j and (r1==r2 or c1==c2): m|=1<<j
    line.append(m)
eff={p:[cf[p][i] & ~line[i] for i in range(B66.N)] for p in PIECES}
for a in range(6):
    for c in range(a+1,6):
        p,q = PIECES[a],PIECES[c]
        if eff[p]==eff[q]: print(f"   {NAMES[p]} and {NAMES[q]} end up with IDENTICAL rules")
for p in PIECES:
    if not any(eff[p]): print(f"   {NAMES[p]} ends up with NO rule at all")
print("   => three rules do the work: diagonal touch, diagonal line, knight's leap")

rule("4. Rule variants explored")
n,_,_ = count(B66, rowcol=False, cap=300000)
print(f"   drop the row/col rule, keep boxes+chess : {n}{'+' if n>=300000 else ''} "
      f"(too loose; rows end up with repeated pieces)")
for label, rules in (("rook -> elephant (2,2 leaper)", dict(STD,R=lambda dr,dc:dr==2 and dc==2)),
                     ("rook -> camel (1,3 leaper)",   dict(STD,R=lambda dr,dc:{dr,dc}=={1,3})),
                     ("queen -> amazon (+knight moves)", dict(STD,Q=lambda dr,dc:dr==dc or dr==0 or dc==0 or {dr,dc}=={1,2})),
                     ("king claims 2 cells of space",   dict(STD,K=lambda dr,dc:max(dr,dc)<=2))):
    n,_,_ = count(B66, rules=rules)
    print(f"   {label:34s} {n:>7d} solutions" + ("   <- IMPOSSIBLE" if n==0 else ""))

rule("5. Are the shipped levels sound?")
import json, os
data = json.load(open(os.path.join(os.path.dirname(__file__),"levels.json")))
S, L = Solver(B66), Logic(B66)
units = L.units
for lv in data["levels"]:
    if lv["solution"] is None: continue
    givens = {int(k):v for k,v in lv["givens"].items()}
    sol = lv["solution"]
    errs=[]
    for cells in units:
        seen=[sol[i] for i in cells]
        if len(set(seen))!=len(seen): errs.append("duplicate in a unit")
    for i in range(B66.N):
        m=cf[sol[i]][i]
        for j in range(B66.N):
            if (m>>j)&1 and sol[j]==sol[i]: errs.append(f"{sol[i]} sees itself")
    if any(sol[i]!=v for i,v in givens.items()): errs.append("clue/solution mismatch")
    n=len(S.solve(givens=dict(givens), limit=3))
    if n!=1: errs.append(f"{n} solutions")
    g,_,_ = L.solve(dict(givens), max_tech=5)
    if g!=sol: errs.append("not solvable by logic alone")
    print(f"   {lv['name']:11s} {lv['clues']} clues, needs {lv['technique']:16s} "
          f"-> {'OK' if not errs else errs}")

rule("6. A sample grid")
print(render(B66, count(B66)[2][0]))
