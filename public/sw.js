const CACHE_NAME = "wtc-service-v5";

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SRVIX is offline</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fffdf7;color:#12384f;font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;padding:24px}
main{max-width:22rem;text-align:center}
h1{margin:0 0 8px;font-size:1.25rem}
p{margin:0 0 20px;font-size:.95rem;line-height:1.5;color:#475569}
button{appearance:none;border:0;border-radius:6px;background:#087fb6;color:#fff;font:inherit;font-weight:600;padding:10px 20px;cursor:pointer}
button:hover{background:#006da3}
</style>
</head>
<body>
<main>
<h1>You are offline</h1>
<p>SRVIX could not reach the network and this page has not been opened on this device before.</p>
<button type="button" onclick="location.reload()">Retry</button>
</main>
</body>
</html>`;

// The only gate on every cache write. A response is storable only when it is a real same-origin
// 2xx that did not arrive at the end of a redirect chain. This rejects 3xx, opaque cross-origin,
// and - critically - the opaqueredirect response (type "opaqueredirect", status 0) that fetch()
// returns for a redirected navigation, since navigations carry redirect: "manual".
function isCacheable(response) {
  return Boolean(response) && response.ok && response.redirected !== true && response.type === "basic";
}

// Reads are scoped to CACHE_NAME and keyed on the incoming request only. Never fall back to a
// different URL - replaying a stored response against an unrelated navigation is what sustained
// the loop.
function cacheMatch(request) {
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.match(request))
    .catch(() => undefined);
}

function putInCache(request, response) {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// No precache. The single former entry (/manifest.webmanifest) is fetched and stored by the browser
// anyway, and an addAll rejection here would fail the install, leaving the device pinned to the
// previous worker - the exact failure this version exists to recover from.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Sign-out posts this so one user's authenticated HTML is not served to the next on a shared device.
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || event.request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  // Navigations: network-first, cache only what isCacheable accepts, and on failure fall back to
  // this exact URL or the offline notice.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          putInCache(event.request, response);
          return response;
        })
        .catch(() => cacheMatch(event.request).then((cached) => cached || offlineResponse())),
    );
    return;
  }

  // Sub-resources: stale-while-revalidate.
  event.respondWith(
    cacheMatch(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        putInCache(event.request, response);
        return response;
      });

      if (cached) {
        network.catch(() => {});
        return cached;
      }
      return network;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "SRVIX";
  const options = {
    body: payload.body || "You have a new SRVIX alert.",
    icon: "/favicon-srvix.png",
    badge: "/favicon-srvix.png",
    tag: payload.tag || "srvix-alert",
    data: {
      url: payload.url || "/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const matchingClient = clientList.find((client) => client.url === targetUrl);
        if (matchingClient) return matchingClient.focus();
        return clients.openWindow(targetUrl);
      }),
  );
});
