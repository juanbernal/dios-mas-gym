/**
 * OneSignalSDKWorker.js
 * Must live at the ROOT of the domain: /OneSignalSDKWorker.js
 * OneSignal requires its own Service Worker scope at root level.
 * This file imports the OneSignal SDK worker so it handles push events.
 * Our custom sw-v3.js continues to handle caching normally.
 */
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
