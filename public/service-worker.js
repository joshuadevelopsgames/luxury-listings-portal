// Service Worker for Luxury Listings Portal PWA
// Strategy:
//   • Hashed JS/CSS/font assets  → Cache-First  (immutable, safe to serve forever)
//   • Images / icons             → Cache-First  (long-lived)
//   • HTML navigation requests   → Network-First, fallback to cache (get fresh app shell)
//   • API / Supabase / Firebase  → Network-Only  (never intercept data calls)

const CACHE_VERSION = 'luxury-listings-v3';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Luxury-listings-logo-CLR.png',
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: delete any caches from old versions ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_VERSION)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True for JS/CSS/font/image files that have a content hash in their filename
 *  (e.g. main.a1b2c3d4.chunk.js). These are immutable — serve from cache forever. */
function isHashedStaticAsset(url) {
  const path = url.pathname;
  return (
    /\.[0-9a-f]{8,}\.(js|css|woff2?|ttf|otf|eot)$/i.test(path) ||
    path.startsWith('/static/')
  );
}

/** True for image/icon files that rarely change */
function isImageAsset(url) {
  return /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(url.pathname);
}

/** True for any API or third-party data call we should never intercept */
function isApiCall(url) {
  return (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.pathname.startsWith('/api/')
  );
}

// ── Fetch: route each request to the right strategy ──────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Never intercept API / data calls
  if (isApiCall(url)) return;

  // ── Strategy 1: Cache-First for hashed/immutable assets ─────────────────
  if (isHashedStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Strategy 2: Cache-First for images ──────────────────────────────────
  if (isImageAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Strategy 3: Network-First for HTML / navigation ─────────────────────
  // Fetches fresh HTML so the app shell is always up to date; falls back to
  // the cached shell if the user is offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) =>
            cached ||
            (event.request.mode === 'navigate'
              ? caches.match('/index.html')
              : new Response('Offline', { status: 503 }))
        )
      )
  );
});

// ── Messages from the app (e.g. force update) ────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
