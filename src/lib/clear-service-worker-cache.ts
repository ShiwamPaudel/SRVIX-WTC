// Posted to the active service worker on sign-out so cached authenticated HTML is not served to the
// next user of a shared device. No-op when there is no controller (first load, SW unsupported, or
// registration not yet active) - the worker wraps the delete in waitUntil, so it still completes
// even though the page navigates away immediately after.
export function clearServiceWorkerCache() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_CACHE" });
}
