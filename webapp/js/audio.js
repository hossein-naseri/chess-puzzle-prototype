// Small synthesised sound set via WebAudio - no binary assets to license or
// ship, and the whole game stays offline-installable. Swap for real SFX
// files later by replacing the `tone`/`sequence` calls in SFX with
// AudioBufferSourceNode playback; the SL.Audio.play(name) call sites
// elsewhere never need to change.
(function(){
"use strict";
let ctx = null;
let muted = !window.SL.Storage.getSound();

function ensureCtx(){
  if(ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  ctx = new AC();
  return ctx;
}
// mobile browsers suspend audio until a user gesture; call this on first tap
function unlock(){
  const c = ensureCtx();
  if(c && c.state === "suspended") c.resume();
}

function tone(freq, dur, {type="sine", gain=0.16, delay=0, glideTo=null}={}){
  if(muted) return;
  const c = ensureCtx(); if(!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if(glideTo) osc.frequency.linearRampToValueAtTime(glideTo, t0+dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}
function sequence(notes){ notes.forEach(n=>tone(n.f, n.d, {...n, delay:n.t})); }

const SFX = {
  select:   ()=> tone(520, 0.05, {type:"triangle", gain:0.10}),
  place:    ()=> tone(660, 0.08, {type:"sine",   gain:0.14}),
  clear:    ()=> tone(340, 0.07, {type:"sine",   gain:0.10}),
  error:    ()=> tone(160, 0.16, {type:"sawtooth", gain:0.10, glideTo:110}),
  locked:   ()=> tone(140, 0.10, {type:"square", gain:0.08}),
  navigate: ()=> tone(440, 0.06, {type:"triangle", gain:0.10}),
  hint:     ()=> sequence([{f:500,d:0.08,t:0},{f:700,d:0.10,t:0.08}]),
  levelUp:  ()=> sequence([{f:392,d:0.09,t:0},{f:494,d:0.09,t:0.09},{f:587,d:0.16,t:0.18}]),
  victory:  ()=> sequence([{f:523,d:0.11,t:0},{f:659,d:0.11,t:0.11},
                            {f:784,d:0.11,t:0.22},{f:1047,d:0.28,t:0.33}]),
  boss:     ()=> sequence([{f:196,d:0.14,t:0,type:"sawtooth"},{f:247,d:0.14,t:0.12,type:"sawtooth"},
                            {f:294,d:0.30,t:0.24,type:"sawtooth"}]),
};

window.SL.Audio = {
  unlock,
  play(name){ if(SFX[name]) SFX[name](); },
  setMuted(v){ muted = !!v; window.SL.Storage.setSound(!muted); },
  isMuted(){ return muted; },
};
})();
