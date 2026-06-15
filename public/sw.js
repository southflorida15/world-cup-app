// /public/sw.js  — Service Worker for FIFA World Cup 2026 PWA
// Strategy: network-first for everything except offline fallback.
// Never cache JS/CSS bundles — Vite uses content hashes so stale caches
// cause users to run old versions. Let Vercel's HTTP cache handle assets.

const CACHE_NAME = "wc2026-v5";
const OFFLINE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: cache only the bare minimum for offline ─────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clear ALL old caches immediately ────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Force update when app requests it ────────────────────────────────────
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Fetch: network-first, never cache JS/CSS bundles ─────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to network for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Never cache Vite build assets (JS/CSS with content hashes)
  // Vercel sets immutable cache headers on these — browser handles them fine
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(fetch(request));
    return;
  }

  // For everything else: network-first, fall back to cache offline
  event.respondWith(
    fetch(request)
      .then(response => {
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
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      // Focus existing PWA window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl);
          return;
        }
      }
      // No existing window — open a new one
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
