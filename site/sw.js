/**
 * Service worker for the YTMD Install Guide PWA.
 * Caches the static install wizard shell so the companion stays available offline.
 * Does NOT ship or run the Electron desktop app.
 */

const CACHE = "ytmd-install-guide-v2";
// Precache "/" only (not /index.html) — Vercel cleanUrls redirects /index.html → / and cache.addAll rejects redirects.
const PRECACHE = [
  "/",
  "/styles.css",
  "/wizard.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/assets/ytmd.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Always hit the network for GitHub / third-party APIs (release metadata).
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for navigations; cache fallback for offline companion use.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Stale-while-revalidate for same-origin static assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
