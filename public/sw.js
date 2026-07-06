// TradePro Nexus Service Worker
// Handles offline caching, install/activate lifecycle, and push notifications

const CACHE_NAME = "tradepro-nexus-v2";
const OFFLINE_URL = "/";

// Key pages and assets precached at install so the app has something to
// serve immediately the first time it is opened with no network connection.
const PRECACHE_URLS = [
  "/",
  "/feed",
  "/build",
  "/search",
  "/work",
  "/resources",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install: cache the offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean out old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network first for page navigations, so users always get the
// freshest content when online, falling back to the cached copy of that
// exact page (or the offline shell) when there is no connection. Cache
// first for static assets, since those are safe to serve straight from
// cache and only need a network round trip the first time.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.startsWith("/screenshot-") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL)))
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "TradePro Nexus", body: event.data.text(), url: "/" };
  }

  const { title, body, url, icon, badge } = payload;

  event.waitUntil(
    self.registration.showNotification(title ?? "TradePro Nexus", {
      body: body ?? "",
      icon: icon ?? "/icon-192.png",
      badge: badge ?? "/icon-192.png",
      data: { url: url ?? "/" },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// Notification click: open the relevant URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
