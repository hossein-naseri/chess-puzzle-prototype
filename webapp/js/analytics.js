// Analytics: single choke point. Every call in the app goes through
// SL.Analytics.log(name, params). Today it only logs to the console and an
// in-memory ring buffer you can inspect from devtools (SL.Analytics.history).
//
// TO WIRE UP REAL ANALYTICS LATER (Firebase):
//   1. npm install @capacitor-firebase/analytics (or @capacitor-community/firebase-analytics)
//   2. Add the Firebase config from your Firebase project (google-services.json
//      for Android goes in android/app/ once the Capacitor project exists).
//   3. Replace the body of `send()` below with:
//        FirebaseAnalytics.logEvent({ name, params });
//      Nothing else in the app needs to change - every screen already calls
//      SL.Analytics.log(), never a vendor SDK directly.
(function(){
"use strict";
const MAX_HISTORY = 300;
const history = [];
let firebaseConfig = null;

function send(name, params){
  // TODO(play-store): route to FirebaseAnalytics.logEvent({name, params}) here.
  console.log("[analytics]", name, params||{});
}

function log(name, params){
  const entry = {name, params: params||{}, t: Date.now()};
  history.push(entry);
  if(history.length > MAX_HISTORY) history.shift();
  send(name, params);
  window.dispatchEvent(new CustomEvent("sl:analytics", {detail: entry}));
}

window.SL.Analytics = {
  log,
  history,
  configureFirebase(config){ firebaseConfig = config; log("analytics_configured", {hasConfig: !!config}); },
};
})();
