// App bootstrap: view routing between the saga map and the game screen,
// the toast helper, and the one-time session_start analytics event.
(function(){
"use strict";
const A = window.SL.Analytics;

let toastTimer = null;
window.SL.toast = function(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.hidden = true; }, 1800);
};

const viewSaga = document.getElementById("view-saga");
const viewGame = document.getElementById("view-game");

function showSaga(){
  window.SL.Ads.hideBanner();
  window.SL.Game.unmount();
  viewGame.hidden = true;
  viewSaga.hidden = false;
  window.SL.Saga.render();
  window.SL.Ads.showBanner();
  A.log("screen_view", {screen: "saga_map"});
}
function openLevel(levelId){
  const level = window.SL.LEVELS.find(l=>l.id===levelId);
  if(!level) return;
  viewSaga.hidden = true;
  viewGame.hidden = false;
  window.SL.Game.mount(level, {
    onExit: showSaga,
    onAdvance: (nextId)=>{ if(nextId) openLevel(nextId); else showSaga(); },
  });
  A.log("screen_view", {screen: "game", level_id: levelId});
}
window.SL.Main = {showSaga, openLevel};

document.getElementById("soundBtn").addEventListener("click", ()=>{
  const muted = !window.SL.Audio.isMuted();
  window.SL.Audio.setMuted(muted);
  document.getElementById("soundBtn").classList.toggle("muted", muted);
  window.SL.Audio.unlock();
  if(!muted) window.SL.Audio.play("navigate");
  A.log("settings_sound_toggled", {enabled: !muted});
});
document.getElementById("soundBtn").classList.toggle("muted", window.SL.Audio.isMuted());

// unlock WebAudio on the very first tap anywhere (mobile autoplay policy)
document.addEventListener("pointerdown", function unlock(){
  window.SL.Audio.unlock();
  document.removeEventListener("pointerdown", unlock);
}, {once:true});

window.SL.Ads.init();
A.log("app_open", {level_count: window.SL.LEVELS.length});
showSaga();
})();
