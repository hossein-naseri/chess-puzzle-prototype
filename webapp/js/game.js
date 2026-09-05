// The board screen: rendering, two-tap placement, sight overlay, conflicts,
// the technique-aware hint engine (rewarded-ad gated), and level completion.
(function(){
"use strict";
const R = window.SL.Rules, St = window.SL.Storage, A = window.SL.Analytics,
      Ads = window.SL.Ads, Au = window.SL.Audio;
const {H,W,N,PIECES,GLYPH,NAME,UNITS,SIGHT,rc,id:idOf,boxOf,coord,conflicts,candidates} = R;

const board = document.getElementById("board");
const rays  = document.getElementById("rays");
let builtBoardDom = false;

function buildBoardDom(){
  if(builtBoardDom) return;
  board.innerHTML = "";
  for(let i=0;i<N;i++){
    const[r,c]=rc(i);
    const b=document.createElement("button");
    b.type="button"; b.className="cell"+((r+c)%2?" dk":"")+
      (c%3===2&&c<W-1?" bx-r":"")+(r%2===1&&r<H-1?" bx-b":"");
    b.dataset.i=i; b.setAttribute("aria-label","square "+coord(i));
    b.addEventListener("click",()=>onCell(i));
    b.addEventListener("mouseenter",()=>{ if(sel===null){ hoverCell=i; render(); } });
    b.addEventListener("mouseleave",()=>{ if(sel===null){ hoverCell=null; render(); } });
    board.appendChild(b);
  }
  document.getElementById("coordsF").innerHTML =
    [...R.FILES].map(f=>"<span>"+f+"</span>").join("");
  document.getElementById("coordsR").innerHTML =
    Array.from({length:H},(_,r)=>"<span>"+(H-r)+"</span>").join("");
  builtBoardDom = true;
}

let level=null, grid=[], givens={}, sel=null, hoverCell=null, undo=[],
    t0=null, tick=null, won=false, finalTimeMs=null, hintsThisRun=0, callbacks=null;

function el(x){ return document.getElementById(x); }
function fmt(ms){ const s=Math.max(0,Math.floor(ms/1000));
  return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }

function nextLevel(){
  const idx = window.SL.LEVELS.findIndex(l=>l.id===level.id);
  return window.SL.LEVELS[idx+1] || null;
}

function say(html,cls){ const s=el("status"); s.className="status"+(cls?" "+cls:""); s.innerHTML=html; }

function mount(lvl, cbs){
  buildBoardDom();
  level = lvl; callbacks = cbs;
  givens={}; grid=new Array(N).fill(null); undo=[]; sel=null; hoverCell=null;
  won=false; finalTimeMs=null; hintsThisRun=0;
  Object.keys(lvl.givens).forEach(k=>{ givens[+k]=lvl.givens[k]; grid[+k]=lvl.givens[k]; });
  t0=null; if(tick){clearInterval(tick); tick=null;} el("gameTimer").textContent="00:00";
  el("victory").hidden=true; el("victoryActions").hidden=true;

  const sectionName = (window.SL.SECTIONS[lvl.section]||{}).name || lvl.section;
  el("gameLevelLabel").textContent = sectionName+" · "+lvl.label;
  el("gameLevelSub").textContent = lvl.tag==="boss" ? "Boss level"
    : lvl.tag==="miniboss" ? "Miniboss" : lvl.blurb;
  say(lvl.blurb);
  drawPalette(); render();

  A.log("level_start", {level_id: lvl.id, section: lvl.section, clues: lvl.clues, tag: lvl.tag||"normal"});
  if(lvl.tag==="boss") Au.play("boss");

  if(lvl.tutorial && !St.getSeenTutorial()) startTutorial();
  else el("tutorialOverlay").hidden = true;
}
function unmount(){
  if(tick){ clearInterval(tick); tick=null; }
  el("tutorialOverlay").hidden = true;
}

function startClock(){
  if(t0) return;
  t0=Date.now();
  tick=setInterval(()=>{ el("gameTimer").textContent=fmt(Date.now()-t0); },1000);
}

/* ---------------- rendering ---------------- */
function render(){
  const {bad,msgs}=conflicts(grid);
  const focus = sel!==null ? sel : hoverCell;
  let lit=new Set(), hits=new Set(), litPiece=null;
  if(focus!==null){
    const p = grid[focus];
    if(p){ litPiece=p; SIGHT[p][focus].forEach(j=>{ lit.add(j); if(grid[j]===p) hits.add(j); }); }
  }
  let filled=0;
  for(let i=0;i<N;i++){
    const cell=board.children[i], p=grid[i];
    if(p) filled++;
    const[r,c]=rc(i);
    cell.className="cell"+((r+c)%2?" dk":"")+
      (c%3===2&&c<W-1?" bx-r":"")+(r%2===1&&r<H-1?" bx-b":"")+
      (i in givens?" given":p?" mine":"")+
      (i===sel?" sel":"")+(lit.has(i)?" sight":"")+
      (bad.has(i)?" bad":"")+
      (tutorialStep===1&&i===tutorialTargetCell?" tut-target":"");
    cell.innerHTML = p ? '<span class="pc">'+GLYPH[p]+"</span>" : "";
  }
  drawRays(lit, hits);
  drawPalette();

  const solved = filled===N && bad.size===0;
  if(solved){
    if(!won){
      won=true;
      finalTimeMs = t0 ? Date.now()-t0 : null;
      if(finalTimeMs) el("gameTimer").textContent=fmt(finalTimeMs);
      onSolved();
    }
  } else if(msgs.length){
    say(msgs[0]+(msgs.length>1?" <em>(+"+(msgs.length-1)+" more)</em>":""),"err");
  }
}
function drawRays(lit,hits){
  rays.innerHTML="";
  const svgns="http://www.w3.org/2000/svg";
  lit.forEach(j=>{
    const[r2,c2]=rc(j);
    const ci=document.createElementNS(svgns,"circle");
    ci.setAttribute("cx",c2*100+50); ci.setAttribute("cy",r2*100+50);
    ci.setAttribute("r",9);
    ci.setAttribute("class","dot"+(hits.has(j)?" bad":"")+(grid[j]?" on-piece":""));
    rays.appendChild(ci);
  });
}
function drawPalette(){
  const pal=el("palette");
  if(!pal.children.length){
    PIECES.forEach(p=>{
      const b=document.createElement("button");
      b.type="button"; b.dataset.p=p;
      b.innerHTML='<span class="left"></span><span class="g">'+GLYPH[p]+
                  '</span><span class="k">'+p+"</span>";
      b.addEventListener("click",()=>onPiece(p));
      pal.appendChild(b);
    });
  }
  [...pal.children].forEach(b=>{
    const p=b.dataset.p, used=grid.filter(x=>x===p).length;
    b.className="pbtn"+(used>=6?" done":"")+
      (tutorialStep===2&&p===tutorialTargetPiece?" tut-target":"");
    b.querySelector(".left").textContent=(6-used)+"×";
  });
}

/* ---------------- interaction ---------------- */
function onCell(i){
  if(tutorialStep!=null) return tutorialCellTap(i);
  if(i in givens){ sel=i; Au.play("select");
    say("<strong>"+coord(i)+"</strong> is a clue — "+NAME[givens[i]].toLowerCase()+", fixed.");
    render(); return; }
  sel=(sel===i?null:i);
  Au.play("select");
  if(sel!==null){
    const cd=candidates(grid,i);
    say(cd.length? "<strong>"+coord(i)+"</strong> selected — tap a piece to place it. "+
        "Still fits: "+cd.map(p=>NAME[p].toLowerCase()).join(", ")+"."
      : "<strong>"+coord(i)+"</strong> has nothing left that fits — something earlier is wrong.");
  }
  render();
}
function onPiece(p){
  if(tutorialStep!=null) return tutorialPieceTap(p);
  if(sel===null){ window.SL.toast("Tap a square first, then tap a piece."); return; }
  if(sel in givens){ window.SL.toast(coord(sel)+" is a fixed clue."); return; }
  place(sel,p);
}
function place(i,p){
  if(i in givens) return;
  undo.push({i, prev:grid[i]});
  grid[i]=(grid[i]===p?null:p);
  sel=i; startClock();
  const cf=conflicts(grid);
  if(cf.bad.has(i)) Au.play("error");
  else Au.play(grid[i] ? "place" : "clear");
  if(!cf.bad.has(i)) say(grid[i]? NAME[p]+" to <strong>"+coord(i)+"</strong>." :
                                  "<strong>"+coord(i)+"</strong> cleared.");
  render();
}
function clearCell(i){ if(i in givens||!grid[i]) return;
  undo.push({i,prev:grid[i]}); grid[i]=null; render(); }

el("btnUndo").addEventListener("click",()=>{
  const u=undo.pop(); if(!u){ window.SL.toast("Nothing to undo."); return; }
  grid[u.i]=u.prev; sel=u.i; Au.play("navigate"); render();
});
el("btnReset").addEventListener("click",()=>{ if(level) mount(level, callbacks); });
el("backBtn").addEventListener("click",()=>{ Au.play("navigate"); callbacks && callbacks.onExit(); });

async function requestHint(){
  if(tutorialStep!=null) return;
  window.SL.toast("Watch a short video for a hint...");
  const granted = await Ads.showRewarded();
  if(!granted){ A.log("hint_declined", {level_id: level.id}); return; }
  hintsThisRun++; St.addHintUsed(level.id);
  A.log("hint_granted", {level_id: level.id});
  Au.play("hint");
  runHintLogic();
}
el("btnHint").addEventListener("click", requestHint);

function runHintLogic(){
  const sol = level.solution;
  const wrong = grid.findIndex((p,i)=>p && !(i in givens) && p!==sol[i]);
  if(wrong>=0){ sel=wrong;
    say("Before anything else: the piece on <strong>"+coord(wrong)+"</strong> cannot be right. Take it off.","err");
    render(); return; }
  for(let i=0;i<N;i++){
    if(grid[i]) continue;
    const cd=candidates(grid,i);
    if(cd.length===1){ sel=i;
      say("Only one piece still fits <strong>"+coord(i)+"</strong>: the "+NAME[cd[0]].toLowerCase()+
          ". Everything else is placed in its rank, file or box, or stands in its sight.");
      render(); return; }
    if(cd.length===0){ sel=i;
      say("Nothing fits <strong>"+coord(i)+"</strong> any more — an earlier piece is wrong.","err");
      render(); return; }
  }
  for(const u of UNITS){
    for(const p of PIECES){
      if(u.cells.some(i=>grid[i]===p)) continue;
      const spots=u.cells.filter(i=>!grid[i]&&candidates(grid,i).includes(p));
      if(spots.length===1){ sel=spots[0];
        say("In <strong>"+u.name+"</strong> the "+NAME[p].toLowerCase()+
            " has one square left: <strong>"+coord(spots[0])+"</strong>.");
        render(); return; }
      if(spots.length===0){
        say("The "+NAME[p].toLowerCase()+" has nowhere to go in <strong>"+u.name+
            "</strong>. Something earlier is wrong.","err"); return; }
    }
  }
  const empty=[]; for(let i=0;i<N;i++) if(!grid[i]) empty.push(i);
  if(empty.length){ const i=empty[0]; place(i,sol[i]); sel=i;
    say("No plain single left, so here is one for free: "+NAME[sol[i]].toLowerCase()+
        " on <strong>"+coord(i)+"</strong>."); return; }
  say("Nothing obvious left to point at.");
}

/* ---------------- completion ---------------- */
async function onSolved(){
  if(tick){clearInterval(tick); tick=null;}
  St.markComplete(level.id, finalTimeMs, hintsThisRun);
  A.log("level_complete", {level_id: level.id, section: level.section,
    time_ms: finalTimeMs, hints_used: hintsThisRun, tag: level.tag||"normal"});
  Au.play("victory");
  const wasFirstTutorial = level.tutorial && !St.getSeenTutorial();
  if(level.tutorial) St.setSeenTutorial(true);

  el("victoryTitle").textContent = level.tag==="boss" ? "Boss defeated" : "Victory";
  el("vTime").textContent = finalTimeMs ? "solved in "+fmt(finalTimeMs) : "";
  el("victory").hidden=false;
  say('Every rank, file and box holds all six, and no piece sees its twin.',"win");

  const total = St.totalCompleted();
  await Ads.maybeInterstitial(total);

  const nl = nextLevel();
  el("btnNextLevel").hidden = !nl;
  el("victoryActions").hidden = false;
}
el("btnLevelSelect").addEventListener("click", ()=>{ Au.play("navigate"); callbacks && callbacks.onAdvance(null); });
el("btnNextLevel").addEventListener("click", ()=>{
  Au.play("navigate");
  const nl = nextLevel();
  callbacks && callbacks.onAdvance(nl ? nl.id : null);
});

/* ---------------- keyboard (desktop testing convenience) ---------------- */
document.addEventListener("keydown",e=>{
  if(el("view-game").hidden) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const k=e.key.toUpperCase();
  if(sel===null&&["ARROWUP","ARROWDOWN","ARROWLEFT","ARROWRIGHT"].includes(k)) sel=0;
  else if(sel!==null){
    let[r,c]=rc(sel), moved=true;
    if(k==="ARROWUP") r=(r+H-1)%H; else if(k==="ARROWDOWN") r=(r+1)%H;
    else if(k==="ARROWLEFT") c=(c+W-1)%W; else if(k==="ARROWRIGHT") c=(c+1)%W;
    else moved=false;
    if(moved){ sel=idOf(r,c); e.preventDefault(); render(); return; }
  }
  if(sel===null) return;
  if(PIECES.includes(k)){ onPiece(k); e.preventDefault(); }
  else if("123456".includes(k)){ onPiece(PIECES[+k-1]); e.preventDefault(); }
  else if(k==="BACKSPACE"||k==="DELETE"){ clearCell(sel); e.preventDefault(); }
  else if(k==="ESCAPE"){ sel=null; render(); }
});

/* ---------------- tutorial (level "on-1" only, shown once) ---------------- */
let tutorialStep = null, tutorialTargetCell = null, tutorialTargetPiece = null;

function findTeachingCell(){
  for(let i=0;i<N;i++){
    if(grid[i]) continue;
    const cd = candidates(grid,i);
    if(cd.length===1) return {cell:i, piece:cd[0]};
  }
  return null;
}
const TUT_TEXT = {
  intro: "Sightlines is chess and sudoku in one board. Every rank, file and box needs " +
         "all six pieces — and no piece may see another of its own kind.",
  sight: "See the dots? They mark every square this piece can see. Two pieces of the " +
         "same kind can never share one.",
  sudoku: "The rest is sudoku: every rank, file and 2×3 box still needs all six pieces, " +
          "exactly once each.",
  outro: "That's the whole game. Finish the rest of this board on your own."
};
function tutorialRender(){
  const overlay = el("tutorialOverlay"), card = el("tutorialCard");
  overlay.hidden = false;
  let html = "", isAction = false;
  if(tutorialStep===0){
    html = "<p>"+TUT_TEXT.intro+"</p><button type=\"button\" class=\"btn key\" id=\"tutNext\">Show me</button>";
  } else if(tutorialStep===1){
    html = "<p>Tap the highlighted square.</p>"; isAction = true;
  } else if(tutorialStep===2){
    html = "<p>Only the <strong>"+NAME[tutorialTargetPiece]+"</strong> fits here. Tap it below.</p>"; isAction = true;
  } else if(tutorialStep===3){
    html = "<p>"+TUT_TEXT.sight+"</p><button type=\"button\" class=\"btn key\" id=\"tutNext\">Got it</button>";
  } else if(tutorialStep===4){
    html = "<p>"+TUT_TEXT.sudoku+"</p><button type=\"button\" class=\"btn key\" id=\"tutNext\">Got it</button>";
  } else if(tutorialStep===5){
    html = "<p>"+TUT_TEXT.outro+"</p><button type=\"button\" class=\"btn key\" id=\"tutFinish\">Play</button>";
  }
  card.innerHTML = html;
  overlay.classList.toggle("no-scrim", isAction);
  const nextBtn = el("tutNext"); if(nextBtn) nextBtn.addEventListener("click", ()=>advanceTutorial());
  const finishBtn = el("tutFinish"); if(finishBtn) finishBtn.addEventListener("click", ()=>endTutorial());

  document.querySelectorAll(".cell.tut-target").forEach(c=>c.classList.remove("tut-target"));
  document.querySelectorAll(".pbtn.tut-target").forEach(c=>c.classList.remove("tut-target"));
  if(tutorialStep===1 && tutorialTargetCell!=null) board.children[tutorialTargetCell].classList.add("tut-target");
  if(tutorialStep===2 && tutorialTargetPiece){
    document.querySelector('.pbtn[data-p="'+tutorialTargetPiece+'"]').classList.add("tut-target");
  }
  A.log("tutorial_step", {step: tutorialStep});
}
function advanceTutorial(){ tutorialStep++; tutorialRender(); }
function startTutorial(){
  const teach = findTeachingCell();
  tutorialTargetCell = teach ? teach.cell : null;
  tutorialTargetPiece = teach ? teach.piece : null;
  tutorialStep = 0;
  tutorialRender();
}
function endTutorial(){
  tutorialStep=null; tutorialTargetCell=null; tutorialTargetPiece=null;
  el("tutorialOverlay").hidden=true;
  el("tutorialOverlay").classList.remove("no-scrim");
  St.setSeenTutorial(true);
  A.log("tutorial_completed", {});
  render();
}
function tutorialCellTap(i){
  onCellReal(i);
  if(i===tutorialTargetCell){ sel=i; render(); advanceTutorial(); }
}
function tutorialPieceTap(p){
  if(p===tutorialTargetPiece && sel===tutorialTargetCell){
    place(sel,p);
    setTimeout(()=>advanceTutorial(), 350);
  } else {
    window.SL.toast("Try the highlighted piece.");
  }
}
// the tutorial still needs plain cell-select behaviour underneath its gating
function onCellReal(i){
  if(i in givens) return;
  sel=(sel===i?null:i);
  render();
}

window.SL.Game = {mount, unmount};
})();
