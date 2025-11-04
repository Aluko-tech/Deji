/* eslint-disable no-restricted-globals */
/* ============================================================
   Service Worker — Deji API Dashboard PWA
   Handles offline mode, caching, and background sync
   ============================================================ */

const CACHE_NAME = "deji-pwa-cache-v1";
const OFFLINE_URL = "/offline.html";
const API_CACHE = "deji-api-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/favicon.ico",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-256x256.png",
  "/icons/icon-512x512.png",
];

// ✅ Only run caching in production
const IS_PROD = self.location.hostname !== "localhost";

// ============================================================
//  INSTALL
// ============================================================
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  if (!IS_PROD) return;

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[SW] Pre-caching essential assets...");
      try {
        await cache.addAll(ASSETS_TO_CACHE);
        console.log("[SW] ✅ Assets cached successfully");
      } catch (err) {
        console.warn("[SW] ⚠️ Some assets failed to cache:", err);
      }
    })
  );

  self.skipWaiting();
});

// ============================================================
//  ACTIVATE
// ============================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  if (!IS_PROD) return;

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![CACHE_NAME, API_CACHE].includes(key)) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// ============================================================
//  FETCH HANDLER
// ============================================================
self.addEventListener("fetch", (event) => {
  if (!IS_PROD) return;

  const { request } = event;
  const url = new URL(request.url);

  // 1️⃣ Network-first for API requests
  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2️⃣ Navigation requests (SPA routes)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 3️⃣ Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((resp) => {
            if (request.method === "GET" && resp.status === 200) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(request, clone)
              );
            }
            return resp;
          })
          .catch(() => cached || caches.match(OFFLINE_URL))
      );
    })
  );
});
