// Board geometry and the chess-sudoku rule engine. Pure functions, no DOM.
(function(){
"use strict";
const BOARD = window.SL.BOARD;
const H = BOARD.H, W = BOARD.W, N = H*W;
const PIECES = ["P","N","B","R","Q","K"];
const GLYPH = {P:"♟",N:"♞",B:"♝",R:"♜",Q:"♛",K:"♚"};
const NAME  = {P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};
const RULE = {
  P:"No twin diagonally touching — pawns capture on the diagonal.",
  N:"No twin a knight's leap away.",
  B:"No twin anywhere on either diagonal, at any distance.",
  R:"Row and column, which the sudoku rule already forbids. The rook is free.",
  Q:"No twin on a diagonal (her rank and file are already spoken for).",
  K:"No twin on any touching square."
};
const FILES = "abcdefghij".slice(0,W);

function rc(i){ return [Math.floor(i/W), i%W]; }
function idOf(r,c){ return r*W+c; }
function boxOf(i){ const[r,c]=rc(i); return BOARD.boxes[r][c]; }
function coord(i){ const[r,c]=rc(i); return FILES[c]+(H-r); }

function sees(p,r1,c1,r2,c2){
  const dr=Math.abs(r2-r1), dc=Math.abs(c2-c1);
  if(!dr&&!dc) return false;
  switch(p){
    case "P": return dr===1&&dc===1;
    case "N": return (dr===1&&dc===2)||(dr===2&&dc===1);
    case "B": return dr===dc;
    case "R": return dr===0||dc===0;
    case "Q": return dr===dc||dr===0||dc===0;
    case "K": return Math.max(dr,dc)===1;
  }
  return false;
}
function sightOf(p,i){
  const[r,c]=rc(i), out=[];
  for(let j=0;j<N;j++){ if(j===i) continue; const[r2,c2]=rc(j);
    if(sees(p,r,c,r2,c2)) out.push(j); }
  return out;
}
const SIGHT={};
PIECES.forEach(p=>{ SIGHT[p]=[]; for(let i=0;i<N;i++) SIGHT[p][i]=sightOf(p,i); });

const UNITS=(()=>{
  const u=[];
  for(let r=0;r<H;r++) u.push({name:"rank "+(H-r), cells:Array.from({length:W},(_,c)=>idOf(r,c))});
  for(let c=0;c<W;c++) u.push({name:"file "+FILES[c], cells:Array.from({length:H},(_,r)=>idOf(r,c))});
  const nbox = Math.max(...BOARD.boxes.flat())+1;
  for(let b=0;b<nbox;b++) u.push({name:"box "+(b+1),
    cells:Array.from({length:N},(_,i)=>i).filter(i=>boxOf(i)===b)});
  return u;
})();

function conflicts(grid){
  const bad=new Set(), msgs=[];
  for(let i=0;i<N;i++){
    const p=grid[i]; if(!p) continue;
    const[r1,c1]=rc(i);
    for(let j=i+1;j<N;j++){
      if(grid[j]!==p) continue;
      const[r2,c2]=rc(j);
      let why=null;
      if(r1===r2) why="share rank "+(H-r1);
      else if(c1===c2) why="share file "+FILES[c1];
      else if(boxOf(i)===boxOf(j)) why="sit in one box";
      else if(sees(p,r1,c1,r2,c2)) why="see each other";
      if(why){ bad.add(i); bad.add(j);
        msgs.push("The "+NAME[p].toLowerCase()+"s on <strong>"+coord(i)+"</strong> and <strong>"+
                  coord(j)+"</strong> "+why+"."); }
    }
  }
  return {bad, msgs};
}
function candidates(grid, i){
  if(grid[i]) return [];
  const[r,c]=rc(i), b=boxOf(i);
  return PIECES.filter(p=>{
    for(let j=0;j<N;j++){
      if(j===i||grid[j]!==p) continue;
      const[r2,c2]=rc(j);
      if(r2===r||c2===c||boxOf(j)===b||sees(p,r,c,r2,c2)) return false;
    }
    return true;
  });
}

window.SL.Rules = {H,W,N,PIECES,GLYPH,NAME,RULE,FILES,UNITS,SIGHT,
  rc, id:idOf, boxOf, coord, sees, sightOf, conflicts, candidates};
})();
