/**
 * PWA update listener – detects when a new service worker is waiting
 * and fires a callback so the app can show a toast / prompt.
 */
import { registerSW } from "virtual:pwa-register";

let updateReady: (() => void) | null = null;

export function initPwaUpdateListener(onUpdateAvailable: () => void) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // A new version is cached and ready
      updateReady = () => updateSW(true); // true = skip waiting & reload
      onUpdateAvailable();
    },
    onOfflineReady() {
      // App is cached for offline – no action needed
    },
  });
}

/** Call this to apply the pending update (reloads the page). */
export function applyPwaUpdate() {
  updateReady?.();
}
