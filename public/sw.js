const CACHE_VERSION = 'v1.1.0';

// v38: 푸시 알림 핸들러 — sound + badge + click action
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_) {
    data = { title: '로컬루션', body: event.data ? event.data.text() : '새 알림' }
  }

  const title = data.title || '로컬루션'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    image: data.image,
    tag: data.tag || 'localution-notification',
    requireInteraction: data.priority === 'high',  // 부정 리뷰 등 중요 알림은 자동 안 사라짐
    silent: data.silent === true,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || '/dashboard',
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'view', title: '보기' },
      { action: 'dismiss', title: '닫기' },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭 있으면 focus
      for (const c of clients) {
        if (c.url.includes(new URL(url, self.location.origin).pathname) && 'focus' in c) {
          return c.focus()
        }
      }
      // 없으면 새 탭
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

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
