// Crash reporting (Firebase Crashlytics) and performance tracing (Firebase
// Performance Monitoring). Real, not simulated - console-only in a plain
// browser, real native calls when running inside the Capacitor shell.
//
// Why this needs its own JS-side wiring, unlike a fully-native app: this
// app's actual logic runs as JavaScript inside the WebView. Crashlytics's
// automatic collection only catches a NATIVE (Java/Kotlin) fatal crash -
// a JS exception here does not crash the native process, so the WebView
// can end up on a broken screen while Crashlytics sees nothing at all,
// unless JS errors are explicitly forwarded as non-fatal reports. That's
// what the global error/rejection listeners below do.
(function(){
"use strict";
const N = window.SL_NATIVE;
const native = !!(N && window.Capacitor && window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform());

function recordException(message){
  console.error("[diagnostics]", message);
  if(!native) return;
  N.FirebaseCrashlytics.recordException({message}).catch(()=>{});
}
function logBreadcrumb(message){
  if(!native) return;
  N.FirebaseCrashlytics.log({message}).catch(()=>{});
}

window.addEventListener("error", e=>{
  recordException((e.message||"error")+" at "+(e.filename||"?")+":"+(e.lineno||"?")+
    (e.error&&e.error.stack ? "\n"+e.error.stack : ""));
});
window.addEventListener("unhandledrejection", e=>{
  const r = e.reason;
  recordException("unhandled rejection: "+(r&&r.stack ? r.stack : String(r)));
});

/* ---------------- performance traces ---------------- */
const active = {};
function startTrace(name){
  if(active[name]) return;
  active[name] = true;
  if(native) N.FirebasePerformance.startTrace({traceName: name}).catch(()=>{});
}
function putAttribute(name, attribute, value){
  if(!native || !active[name]) return;
  N.FirebasePerformance.putAttribute({traceName: name, attribute, value: String(value)}).catch(()=>{});
}
function stopTrace(name){
  if(!active[name]) return;
  delete active[name];
  if(native) N.FirebasePerformance.stopTrace({traceName: name}).catch(()=>{});
}

window.SL.Diagnostics = {recordException, logBreadcrumb, startTrace, putAttribute, stopTrace, isNative: native};
})();
