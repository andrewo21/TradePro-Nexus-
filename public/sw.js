// TradePro Nexus Service Worker
// Handles push notifications and basic offline caching

const CACHE_NAME = "tradepro-nexus-v1";
const OFFLINE_URL = "/";

// Install — cache offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_URL, "/feed", "/build"])
    ).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache for navigation
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL)
      )
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

// Notification click — open the relevant URL
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
