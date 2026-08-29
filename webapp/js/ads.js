// Ad placements: bottom banner, interstitial (first after level 2, then
// every level), rewarded video gating hints. All three are simulated here
// with real timing and a real UI flow so the cadence and UX can be judged
// before any network SDK is wired in.
//
// TO WIRE UP ADMOB LATER (Capacitor):
//   1. npm install @capacitor-community/admob
//   2. Call SL.Ads.configureAdMob({appId, bannerUnitId, interstitialUnitId,
//      rewardedUnitId}) once you have real ad unit IDs from your AdMob
//      account (test IDs first - see Google's AdMob test ad unit docs).
//   3. Replace the bodies of showBanner/hideBanner/_playInterstitial/
//      _playRewarded below with the matching AdMob plugin calls
//      (AdMob.showBanner, AdMob.prepareInterstitial+showInterstitial,
//      AdMob.prepareRewardedAd+showRewardedAd). Every call site elsewhere
//      in the app already goes through the functions in this file, so nothing
//      else changes.
(function(){
"use strict";
const A = window.SL.Analytics;
let ids = null;
let bannerEl = null;
let overlayEl = null;
let interstitialEligible = false;   // flips true once 2 levels are completed

function ensureDom(){
  if(bannerEl) return;
  bannerEl = document.createElement("div");
  bannerEl.className = "ad-banner";
  bannerEl.innerHTML = '<span class="ad-banner-label">Advertisement</span>' +
    '<span class="ad-banner-fake">Sightlines Premium — remove ads</span>';
  bannerEl.hidden = true;
  document.body.appendChild(bannerEl);

  overlayEl = document.createElement("div");
  overlayEl.className = "ad-overlay";
  overlayEl.hidden = true;
  document.body.appendChild(overlayEl);
}

function showBanner(){
  ensureDom();
  bannerEl.hidden = false;
  document.body.classList.add("has-ad-banner");
  A.log("ad_banner_shown", {});
}
function hideBanner(){
  ensureDom();
  bannerEl.hidden = true;
  document.body.classList.remove("has-ad-banner");
}

// opts.skippableAfter = seconds that must elapse before a skip control appears
// at all (0/undefined = not skippable - the interstitial case). The ad always
// auto-resolves at `seconds` regardless of whether it was skippable.
function playSimulated(kind, seconds, opts){
  ensureDom();
  return new Promise(resolve=>{
    A.log(kind+"_requested", {});
    let remain = seconds;
    const canSkip = !!opts.skippableAfter;
    overlayEl.innerHTML =
      '<div class="ad-card">'+
        '<div class="ad-kind">'+opts.title+'</div>'+
        '<div class="ad-fake-creative">'+opts.creative+'</div>'+
        '<div class="ad-row">'+
          '<span class="ad-timer" id="adTimer">'+remain+'s</span>'+
          (canSkip ? '<button type="button" class="ad-skip" id="adSkip" disabled>wait...</button>' : '')+
        '</div>'+
      '</div>';
    overlayEl.hidden = false;
    A.log(kind+"_shown", {});
    const skipBtn = overlayEl.querySelector("#adSkip");
    const timerEl = overlayEl.querySelector("#adTimer");
    let finished = false;
    function finish(reason){
      if(finished) return; finished = true;
      clearInterval(timer);
      overlayEl.hidden = true;
      overlayEl.innerHTML = "";
      A.log(kind+"_"+reason, {});
      resolve(reason);
    }
    if(skipBtn) skipBtn.addEventListener("click", ()=> finish("skipped"));
    const timer = setInterval(()=>{
      remain -= 1;
      timerEl.textContent = Math.max(remain,0)+"s";
      if(canSkip && skipBtn && seconds-remain >= opts.skippableAfter){
        skipBtn.disabled = false; skipBtn.textContent = opts.skipLabel;
      }
      if(remain<=0) finish(opts.rewarded ? "completed" : "dismissed");
    },1000);
  });
}

async function maybeInterstitial(totalCompletedSoFar){
  // first trigger once 2 levels are done; every completion after that too
  if(totalCompletedSoFar < 2) return;
  await playSimulated("interstitial", 3, {
    title: "Interstitial ad", creative: "(placeholder creative)",
    skippableAfter: 0, rewarded: false,
  });
}

async function showRewarded(){
  const reason = await playSimulated("rewarded_ad", 5, {
    title: "Watch for a hint", creative: "(placeholder rewarded video)",
    skipLabel: "Skip (no reward)", skippableAfter: 2, rewarded: true,
  });
  return reason === "completed";
}

window.SL.Ads = {
  init(){ ensureDom(); },
  showBanner, hideBanner,
  maybeInterstitial,
  showRewarded,
  configureAdMob(config){ ids = config; A.log("ads_configured", {hasConfig: !!config}); },
};
})();
