// /public/sw.js  — Service Worker for FIFA World Cup 2026 PWA
// Caches the app shell for offline use.
// Live API data (scores, predictions) always fetches fresh from network.

const CACHE_NAME = "wc2026-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: cache app shell ──────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always fetch API calls fresh — never serve stale scores/predictions
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Always fetch HTML fresh — ensures users get latest app version
  if (request.headers.get("accept")?.includes("text/html") || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful GET responses
        if (request.method === "GET" && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("push", event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "World Cup 2026", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "⚽ World Cup 2026", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "wc2026",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/")
  );
});