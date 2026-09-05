// Ad placements: bottom banner, interstitial (first after level 2, then
// every level), rewarded video gating hints.
//
// Two code paths live side by side:
//  - SIMULATED (default in a plain browser / the shared web preview): a
//    real UI flow with real timing, backed by a fake creative, so the
//    cadence and UX can be judged with nothing installed.
//  - NATIVE (when native-bridge.js has loaded inside the Capacitor shell):
//    the real AdMob SDK via window.SL_NATIVE.AdMob. Every call site below
//    (showBanner/hideBanner/maybeInterstitial/showRewarded) picks the right
//    path itself - nothing calling into this file needs to know which one
//    is active.
//
// TEST_MODE guards against the real ad unit IDs ever serving (or being
// clicked) during development: while true, native ad requests use Google's
// public test ad unit IDs and isTesting:true, regardless of the real IDs
// on file below. Flip to false only when building a release intended for
// the Play Store.
(function(){
"use strict";
const A = window.SL.Analytics;
const N = window.SL_NATIVE;
const native = !!(N && window.Capacitor && window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform());

const TEST_MODE = true;

// Real IDs - com.lowpolyllamas.chessdoku, see admob/README.md.
const REAL = {
  bannerId: "ca-app-pub-7235972156134582/7118434464",
  interstitialId: "ca-app-pub-7235972156134582/6310066476",
  rewardedId: "ca-app-pub-7235972156134582/6804890495",
};
// Google's official public test ad units - safe for anyone to load and tap,
// no test-device registration needed. https://developers.google.com/admob/android/test-ads
const TEST = {
  bannerId: "ca-app-pub-3940256099942544/6300978111",
  interstitialId: "ca-app-pub-3940256099942544/1033173712",
  rewardedId: "ca-app-pub-3940256099942544/5224354917",
};
const IDS = TEST_MODE ? TEST : REAL;

let initialized = false;
async function ensureInit(){
  if(!native || initialized) return;
  initialized = true;
  await N.AdMob.initialize({ initializeForTesting: TEST_MODE });
}

/* ---------------- native ---------------- */
let bannerLoaded = false;
async function showBannerNative(){
  await ensureInit();
  if(!bannerLoaded){
    bannerLoaded = true;
    await N.AdMob.showBanner({ adId: IDS.bannerId, adSize: N.BannerAdSize.ADAPTIVE_BANNER,
      position: N.BannerAdPosition.BOTTOM_CENTER, isTesting: TEST_MODE });
  } else {
    await N.AdMob.resumeBanner();
  }
  A.log("ad_banner_shown", {});
}
function hideBannerNative(){ if(bannerLoaded) N.AdMob.hideBanner(); }

async function interstitialNative(){
  A.log("interstitial_requested", {});
  await ensureInit();
  try{
    await N.AdMob.prepareInterstitial({ adId: IDS.interstitialId, isTesting: TEST_MODE });
  }catch(e){
    A.log("interstitial_failed_to_load", {message: String(e && e.message || e)});
    return;   // never block level progression on an ad that failed to load
  }
  A.log("interstitial_shown", {});
  await new Promise(resolve=>{
    let done = false;
    const finish = reason => { if(done) return; done = true; A.log("interstitial_"+reason, {}); resolve(); };
    N.AdMob.addListener("interstitialAdDismissed", ()=> finish("dismissed"));
    N.AdMob.addListener("interstitialAdFailedToShow", ()=> finish("dismissed"));
    N.AdMob.showInterstitial().catch(()=> finish("dismissed"));
  });
}

async function rewardedNative(){
  A.log("rewarded_ad_requested", {});
  await ensureInit();
  try{
    await N.AdMob.prepareRewardVideoAd({ adId: IDS.rewardedId, isTesting: TEST_MODE });
  }catch(e){
    A.log("rewarded_ad_failed_to_load", {message: String(e && e.message || e)});
    return false;
  }
  A.log("rewarded_ad_shown", {});
  return new Promise(resolve=>{
    let done = false;
    const finish = (granted, reason) => { if(done) return; done = true; A.log("rewarded_ad_"+reason, {}); resolve(granted); };
    N.AdMob.addListener("onRewardedVideoAdReward", ()=> finish(true, "completed"));
    N.AdMob.addListener("onRewardedVideoAdDismissed", ()=> finish(false, "skipped"));
    N.AdMob.addListener("onRewardedVideoAdFailedToShow", ()=> finish(false, "skipped"));
    N.AdMob.showRewardVideoAd().catch(()=> finish(false, "skipped"));
  });
}

/* ---------------- simulated (unchanged web-preview behaviour) ---------------- */
let bannerEl = null, overlayEl = null;
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
function showBannerSimulated(){
  ensureDom();
  bannerEl.hidden = false;
  document.body.classList.add("has-ad-banner");
  A.log("ad_banner_shown", {});
}
function hideBannerSimulated(){
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
async function interstitialSimulated(){
  await playSimulated("interstitial", 3, {
    title: "Interstitial ad", creative: "(placeholder creative)",
    skippableAfter: 0, rewarded: false,
  });
}
async function rewardedSimulated(){
  const reason = await playSimulated("rewarded_ad", 5, {
    title: "Watch for a hint", creative: "(placeholder rewarded video)",
    skipLabel: "Skip (no reward)", skippableAfter: 2, rewarded: true,
  });
  return reason === "completed";
}

/* ---------------- public API: picks native or simulated ---------------- */
async function maybeInterstitial(totalCompletedSoFar){
  // first trigger once 2 levels are done; every completion after that too
  if(totalCompletedSoFar < 2) return;
  await (native ? interstitialNative() : interstitialSimulated());
}
async function showRewarded(){
  return native ? rewardedNative() : rewardedSimulated();
}

window.SL.Ads = {
  init(){ if(native) ensureInit(); else ensureDom(); },
  showBanner(){ return native ? showBannerNative() : showBannerSimulated(); },
  hideBanner(){ return native ? hideBannerNative() : hideBannerSimulated(); },
  maybeInterstitial,
  showRewarded,
  isNative: native,
};
})();
