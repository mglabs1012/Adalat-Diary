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

const VERSION = 'v1';
const STATIC_CACHE = `adalat-static-${VERSION}`;
const PAGE_CACHE = `adalat-pages-${VERSION}`;
const DATA_CACHE = `adalat-data-${VERSION}`;

const OFFLINE_URL = '/offline';
const PRECACHE = ['/', '/cases', '/diary', OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png'];

const DATA_MAX_ENTRIES = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // addAll is all-or-nothing; a single 404 must not break installation.
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
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
async function trim(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(event) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    if (response && response.ok) cache.put(event.request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ||
      new Response('<h1>You are offline</h1>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trim(DATA_CACHE, DATA_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => null);

  // Serve the cached copy immediately, but keep the worker alive long enough
  // for the revalidation to land in the cache.
  if (cached) {
    event.waitUntil(network);
    return cached;
  }

  const fresh = await network;
  return (
    fresh ||
    new Response(JSON.stringify({ error: 'You are offline and this list has not been saved yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
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
