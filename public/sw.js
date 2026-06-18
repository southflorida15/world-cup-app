// /public/sw.js  — Service Worker for FIFA World Cup 2026 PWA
// Strategy: network-first for everything except offline fallback.
// Never cache JS/CSS bundles — Vite uses content hashes so stale caches
// cause users to run old versions. Let Vercel's HTTP cache handle assets.

const CACHE_NAME = "wc2026-v6";
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

  // Store message in localStorage via postMessage to all clients
  const message = {
    id: Date.now(),
    title: data.title || "⚽ World Cup 2026",
    body: data.body || "",
    url: data.url || "/",
    receivedAt: Date.now(),
    read: false,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "⚽ World Cup 2026", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "wc2026",
        data: { url: data.url || "/", message },
      }),
      // Broadcast to all open clients so they can store it
      clients.matchAll({ includeUncontrolled: true }).then(cls => {
        cls.forEach(c => c.postMessage({ type: "PUSH_RECEIVED", message }));
      }),
    ])
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const message = event.notification.data?.message;
  const baseUrl = event.notification.data?.url || "/";

  // Encode the message into the URL so a freshly-opened or freshly-navigated
  // page can pick it up on load, regardless of postMessage timing races.
  let targetUrl = baseUrl;
  if (message) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(message));
      const sep = baseUrl.includes("?") ? "&" : "?";
      targetUrl = `${baseUrl}${sep}pushMsg=${encoded}`;
    } catch (e) {
      // fall back to baseUrl without the param
    }
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          // Send via postMessage for the case where the page is already
          // mounted and listening right now...
          if (message) client.postMessage({ type: "PUSH_RECEIVED", message });
          // ...and also navigate with the message in the URL as a durable
          // fallback in case the page reloads or the listener isn't ready yet.
          if ("navigate" in client) client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
