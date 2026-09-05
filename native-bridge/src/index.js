// Bundled once with esbuild into webapp/js/native-bridge.js (a plain,
// non-module script) so the rest of the app can stay framework/bundler-free.
// This is the ONLY file in the project that imports an npm package - see
// package.json's "build:native-bridge" script, and SAGA.md for why.
//
// Exposes window.SL_NATIVE = { AdMob, BannerAdSize, BannerAdPosition, FirebaseAnalytics }
// when running inside the Capacitor native shell. In a plain browser this
// script still loads (Capacitor.isNativePlatform() just returns false), so
// js/ads.js and js/analytics.js always fall back to their simulated flow
// there - nothing about the existing web-preview behaviour changes.
import { AdMob, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";

window.SL_NATIVE = { AdMob, BannerAdSize, BannerAdPosition, FirebaseAnalytics };
