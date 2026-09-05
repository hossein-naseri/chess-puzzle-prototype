// Saga-style level select: four themed chapters, sequential unlock, a
// skip-ahead escape hatch on each chapter barrier, miniboss/boss markers.
(function(){
"use strict";
const St = window.SL.Storage, A = window.SL.Analytics, Au = window.SL.Audio;
const SECTION_ORDER = ["onboarding","earlygame","midgame","endgame"];
const LANES = ["lane-l","lane-c","lane-r","lane-c"];

const ICON_MINIBOSS =
  '<svg viewBox="0 0 24 24" class="node-icon"><path d="M12 3 4 7v5c0 4.6 3.4 8.2 8 9 4.6-.8 8-4.4 8-9V7l-8-4Z" ' +
  'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_BOSS =
  '<svg viewBox="0 0 24 24" class="node-icon"><path d="M3 8l3 3 3.5-5L12 11l2.5-5L18 9l3-3-1.6 10H4.6L3 8Z" ' +
  'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
  '<path d="M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_CHECK =
  '<svg viewBox="0 0 24 24" class="node-check"><path d="M4 12.5 9.5 18 20 6" fill="none" ' +
  'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_LOCK =
  '<svg viewBox="0 0 24 24" class="node-lock"><rect x="5" y="10.5" width="14" height="9.5" rx="1.6" ' +
  'fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" ' +
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function levelsBySection(){
  const bySec = {};
  window.SL.LEVELS.forEach((lvl,idx)=>{ (bySec[lvl.section]=bySec[lvl.section]||[]).push({lvl,idx}); });
  return bySec;
}
function isUnlocked(idx){
  const arr = window.SL.LEVELS;
  if(idx===0) return true;
  const lvl = arr[idx];
  const prevDone = St.isComplete(arr[idx-1].id);
  const skipUsed = lvl.local===1 && St.hasSkip(lvl.section);
  return prevDone || skipUsed;
}
function nextPlayableId(){
  const arr = window.SL.LEVELS;
  for(let i=0;i<arr.length;i++) if(isUnlocked(i) && !St.isComplete(arr[i].id)) return arr[i].id;
  return null;
}

function nodeHtml(lvl, idx){
  const unlocked = isUnlocked(idx), done = St.isComplete(lvl.id);
  const isNext = lvl.id === window._slNextPlayable;
  const cls = ["level-node", LANES[idx % LANES.length]];
  if(!unlocked) cls.push("locked");
  if(done) cls.push("done");
  if(lvl.tag==="boss") cls.push("boss");
  if(lvl.tag==="miniboss") cls.push("miniboss");
  if(isNext) cls.push("next-up");
  let icon = "";
  if(done) icon = ICON_CHECK;
  else if(!unlocked) icon = ICON_LOCK;
  else if(lvl.tag==="boss") icon = ICON_BOSS;
  else if(lvl.tag==="miniboss") icon = ICON_MINIBOSS;
  return '<button type="button" class="'+cls.join(" ")+'" data-id="'+lvl.id+'" '+
    (unlocked?'':'aria-disabled="true"')+'>'+
    '<span class="node-num">'+lvl.label+'</span>'+
    (icon?'<span class="node-badge">'+icon+'</span>':'')+
    '</button>';
}

function barrierHtml(fromKey, toKey){
  const arr = window.SL.LEVELS;
  const toStartIdx = arr.findIndex(l=>l.section===toKey && l.local===1);
  const passed = isUnlocked(toStartIdx);
  const toName = window.SL.SECTIONS[toKey].name;
  const fromName = window.SL.SECTIONS[fromKey].name;
  const fromHasBoss = arr.some(l=>l.section===fromKey && l.tag==="boss");
  const openLine = fromHasBoss ? "Beat "+fromName+"'s boss to open "+toName
                                : "Finish "+fromName+" to open "+toName;
  if(passed){
    return '<div class="chapter-divider" data-passed="1"><span>'+toName+'</span></div>';
  }
  return '<div class="chapter-barrier" data-from="'+fromKey+'" data-to="'+toKey+'">'+
    '<div class="barrier-lock">'+ICON_LOCK+'</div>'+
    '<div class="barrier-text">'+openLine+'</div>'+
    '<button type="button" class="barrier-skip" data-to="'+toKey+'" data-from="'+fromName+'" data-toname="'+toName+'">'+
    'Skip ahead</button></div>';
}

function render(){
  window._slNextPlayable = nextPlayableId();
  const bySec = levelsBySection();
  const root = document.getElementById("sagaScroll");
  let html = "";
  SECTION_ORDER.forEach((key, si)=>{
    const meta = window.SL.SECTIONS[key];
    const rows = bySec[key];
    const doneCount = rows.filter(r=>St.isComplete(r.lvl.id)).length;
    html += '<section class="section-band section-'+key+'">' +
      '<div class="section-header"><div class="section-eyebrow">Chapter '+(si+1)+' of 4</div>'+
      '<h2>'+meta.name+'</h2>'+
      '<div class="section-progress">'+doneCount+' / '+rows.length+' cleared</div></div>'+
      '<div class="node-path">' +
      rows.map(({lvl,idx})=>nodeHtml(lvl,idx)).join('<div class="node-connector"></div>') +
      '</div></section>';
    if(si < SECTION_ORDER.length-1) html += barrierHtml(key, SECTION_ORDER[si+1]);
  });
  root.innerHTML = html;

  const total = window.SL.LEVELS.length;
  const done = window.SL.LEVELS.filter(l=>St.isComplete(l.id)).length;
  document.getElementById("progressChip").textContent = done+" / "+total;

  root.querySelectorAll(".level-node").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.id;
      if(btn.classList.contains("locked")){
        Au.play("locked");
        window.SL.toast("Finish the level before this one first.");
        return;
      }
      Au.play("navigate");
      window.SL.Main.openLevel(id);
    });
  });
  root.querySelectorAll(".barrier-skip").forEach(btn=>{
    btn.addEventListener("click", ()=> openSkipModal(btn.dataset.to, btn.dataset.from, btn.dataset.toname));
  });

  if(window._slNextPlayable){
    const target = root.querySelector('.level-node[data-id="'+window._slNextPlayable+'"]');
    if(target) setTimeout(()=> target.scrollIntoView({block:"center", behavior:"instant"}), 0);
  }
}

let pendingSkipTo = null;
function openSkipModal(toKey, fromName, toName){
  pendingSkipTo = toKey;
  document.getElementById("skipTitle").textContent = "Skip to "+toName+"?";
  document.getElementById("skipBody").textContent =
    "You'll unlock "+toName+"'s first level right away. Levels you haven't beaten in "+
    fromName+" stay locked until you go back and clear them. Only do this if "+fromName+
    " is feeling too easy.";
  document.getElementById("skipOverlay").hidden = false;
  A.log("section_barrier_skip_tapped", {to_section: toKey});
}
document.getElementById("skipNo").addEventListener("click", ()=>{
  document.getElementById("skipOverlay").hidden = true;
  A.log("section_barrier_skip_cancelled", {to_section: pendingSkipTo});
});
document.getElementById("skipYes").addEventListener("click", ()=>{
  St.setSkip(pendingSkipTo);
  A.log("section_unlocked", {section: pendingSkipTo, via: "skip"});
  document.getElementById("skipOverlay").hidden = true;
  Au.play("levelUp");
  render();
});

window.SL.Saga = {render};
})();
