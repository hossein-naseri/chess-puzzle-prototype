// Local progress persistence. Swap target for the Play Store build:
// replace localStorage with @capacitor/preferences (same get/set shape,
// just async) - the rest of the app only calls the functions below.
(function(){
"use strict";
const KEY = "sightlines.progress.v1";

function blank(){
  return { completed:{}, times:{}, hints:{}, skip:{}, sound:true, seenTutorial:false };
}
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return blank();
    const s = JSON.parse(raw);
    return Object.assign(blank(), s);
  }catch(e){ return blank(); }
}
let state = load();
function persist(){
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ /* storage unavailable: play on, just don't save */ }
}

window.SL.Storage = {
  isComplete: id => !!state.completed[id],
  bestTime: id => state.times[id] || null,
  hintsUsed: id => state.hints[id] || 0,
  markComplete(id, timeMs, hintsUsedThisRun){
    state.completed[id] = true;
    if(timeMs!=null && (!state.times[id] || timeMs < state.times[id])) state.times[id] = timeMs;
    state.hints[id] = (state.hints[id]||0) + (hintsUsedThisRun||0);
    persist();
  },
  addHintUsed(id){ state.hints[id] = (state.hints[id]||0)+1; persist(); },
  hasSkip: boundary => !!state.skip[boundary],
  setSkip(boundary){ state.skip[boundary] = true; persist(); },
  getSound: () => state.sound !== false,
  setSound(v){ state.sound = !!v; persist(); },
  getSeenTutorial: () => !!state.seenTutorial,
  setSeenTutorial(v){ state.seenTutorial = !!v; persist(); },
  totalCompleted: () => Object.keys(state.completed).length,
  _debugReset(){ state = blank(); persist(); },
};
})();
