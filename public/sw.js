const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `localution-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Files to cache (app shell)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((error) => {
        console.warn('PRECACHE_URLS failed, some files may not be available offline:', error);
        // Continue even if some files fail to cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('localution-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((cachedResponse) => {
            return (
              cachedResponse ||
              caches.match(OFFLINE_PAGE).then((offlineResponse) => {
                return offlineResponse || new Response('Offline', { status: 503 });
              })
            );
          });
        })
    );
    return;
  }

  // Cache-first strategy for assets (JS, CSS, images)
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.eot')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request)
            .then((response) => {
              // Cache the fetched response
              if (response.ok) {
                const cache = caches.open(CACHE_NAME);
                cache.then((c) => c.put(request, response.clone()));
              }
              return response;
            })
            .catch(() => {
              // Return offline page for asset failures
              return caches.match(OFFLINE_PAGE);
            })
        );
      })
    );
    return;
  }

  // Network-first strategy for HTML pages (default)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.status === 200) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        // Return cached response or offline page
        return caches.match(request).then((cachedResponse) => {
          return (
            cachedResponse ||
            caches.match(OFFLINE_PAGE).then((offlineResponse) => {
              return offlineResponse || new Response('Offline', { status: 503 });
            })
          );
        });
      })
  );
});
