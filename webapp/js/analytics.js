// Analytics: single choke point. Every call in the app goes through
// SL.Analytics.log(name, params). Logs to the console + an in-memory ring
// buffer (inspect from devtools: SL.Analytics.history) always; when running
// inside the native Capacitor shell with the Firebase plugin bundled
// (see native-bridge/, SAGA.md), it ALSO forwards to real Firebase
// Analytics. Nothing else in the app needs to know the difference - every
// screen calls SL.Analytics.log(), never a vendor SDK directly.
(function(){
"use strict";
const MAX_HISTORY = 300;
const history = [];
const native = window.SL_NATIVE && window.Capacitor && window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform();

// GA4 event params must be string, long or double - no native boolean type,
// so coerce true/false to 1/0 rather than let the native bridge mangle it.
function sanitize(params){
  const out = {};
  for(const k in params){
    const v = params[k];
    out[k] = typeof v === "boolean" ? (v ? 1 : 0) : v;
  }
  return out;
}

function send(name, params){
  console.log("[analytics]", name, params||{});
  if(!native) return;
  window.SL_NATIVE.FirebaseAnalytics.logEvent({name, params: sanitize(params||{})})
    .catch(e=> console.warn("[analytics] Firebase logEvent failed", e));
}

function log(name, params){
  const entry = {name, params: params||{}, t: Date.now()};
  history.push(entry);
  if(history.length > MAX_HISTORY) history.shift();
  send(name, params);
  window.dispatchEvent(new CustomEvent("sl:analytics", {detail: entry}));
}

window.SL.Analytics = {log, history, isNative: !!native};
})();
