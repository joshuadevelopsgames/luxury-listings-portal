// Service Worker for Luxury Listings Portal PWA
// Strategy:
//   • Hashed JS/CSS/font assets  → Cache-First  (immutable, safe to serve forever)
//   • Images / icons             → Cache-First  (long-lived)
//   • HTML / navigation          → Network-Only (Vercel CDN is fast; caching HTML
//                                  causes stale-chunk errors after deploys)
//   • API / Supabase / Firebase  → Network-Only (never intercept data calls)

const CACHE_VERSION = 'luxury-listings-v4';
const SHELL_ASSETS = [
  // Only cache truly static assets — NOT index.html.
  // Caching index.html causes stale chunk references after Vercel deploys.
  '/manifest.json',
  '/Luxury-listings-logo-CLR.png',
];

// ── Install: pre-cache minimal shell assets ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: delete ALL old caches (including stale HTML) ──────────────────
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

/** True for JS/CSS/font files that have a content hash in their filename
 *  (e.g. main.a1b2c3d4.chunk.js). These are immutable — serve from cache forever. */
function isHashedStaticAsset(url) {
  const path = url.pathname;
  return (
    /\.[0-9a-f]{8,}\.(js|css|woff2?|ttf|otf|eot)$/i.test(path) ||
    (path.startsWith('/static/') && !path.endsWith('.html'))
  );
}

/** True for image/icon files that rarely change */
function isImageAsset(url) {
  return /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(url.pathname);
}

/** True for HTML / navigation requests — these should NEVER be cached */
function isNavigationOrHtml(request, url) {
  return (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('.html')
  );
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

  // ── Navigation / HTML: Network-Only (no caching, no fallback) ───────────
  // Vercel CDN serves index.html fast enough. Caching it risks serving stale
  // HTML that references chunk filenames Vercel has already purged.
  if (isNavigationOrHtml(event.request, url)) {
    // Let the browser handle it natively — don't call event.respondWith()
    return;
  }

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

  // ── Everything else: Network-First ──────────────────────────────────────
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
          (cached) => cached || new Response('Offline', { status: 503 })
        )
      )
  );
});

// ── Messages from the app ────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  // Purge all caches — used by ChunkLoadError recovery to force fresh assets
  if (event.data === 'purgeAndReload') {
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    ).then(() => {
      // Tell all clients to reload once caches are gone
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage('cachesPurged'));
      });
    });
  }
});
