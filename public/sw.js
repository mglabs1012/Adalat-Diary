/* Adalat Diary service worker.
 *
 * Three strategies, chosen by what the request is:
 *   - build assets (/_next/static, icons, fonts) → cache-first, immutable
 *   - navigations                                → network-first, cache fallback,
 *                                                  then the offline screen
 *   - GET /api/cases|stats                       → stale-while-revalidate, so the
 *                                                  docket paints instantly and
 *                                                  corrects itself a moment later
 *
 * Non-GET API calls are never cached: writes go through the IndexedDB outbox
 * in the app, which owns retry and ordering.
 */

const VERSION = 'v2';
const STATIC_CACHE = `adalat-static-${VERSION}`;
const PAGE_CACHE = `adalat-pages-${VERSION}`;
const DATA_CACHE = `adalat-data-${VERSION}`;

const OFFLINE_URL = '/offline';
const PRECACHE = ['/', '/cases', '/diary', OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png'];

const DATA_MAX_ENTRIES = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) =>
      // addAll is all-or-nothing; a single 404 must not break installation.
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => {
        if (self.registration.navigationPreload) return self.registration.navigationPreload.enable();
        return undefined;
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|svg|jpg|webp|ico)$/.test(url.pathname)
  );
}

function isCacheableApi(url) {
  return url.pathname.startsWith('/api/cases') || url.pathname.startsWith('/api/stats');
}

/** Keeps the data cache from growing without bound on a long-lived install. */
function trim(cacheName, maxEntries) {
  return caches.open(cacheName).then((cache) =>
    cache.keys().then((keys) => {
      if (keys.length <= maxEntries) return undefined;
      return Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
    }),
  );
}

function cacheFirst(request) {
  return caches.open(STATIC_CACHE).then((cache) =>
    cache.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
    }),
  );
}

function networkFirstPage(event) {
  return caches.open(PAGE_CACHE).then((cache) =>
    Promise.resolve(event.preloadResponse)
      .then((preloaded) => preloaded || fetch(event.request))
      .then((response) => {
        if (response && response.ok) cache.put(event.request, response.clone());
        return response;
      })
      .catch(() =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return cache.match(OFFLINE_URL).then(
            (offline) =>
              offline ||
              new Response('<h1>You are offline</h1>', {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              }),
          );
        }),
      ),
  );
}

function staleWhileRevalidate(event) {
  const request = event.request;
  return caches.open(DATA_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          return cache.put(request, response.clone()).then(() => trim(DATA_CACHE, DATA_MAX_ENTRIES)).then(() => response);
        })
        .catch(() => null);

      // Serve the cached copy immediately, but keep the worker alive long enough
      // for the revalidation to land in the cache.
      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      return network.then(
        (fresh) =>
          fresh ||
          new Response(JSON.stringify({ error: 'You are offline and this list has not been saved yet.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }),
      );
    }),
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isCacheableApi(url)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
