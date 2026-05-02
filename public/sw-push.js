// public/sw-push.js — 로컬루션 알림 Service Worker
//
// PushSubscription 으로 도착한 알림을 OS Notification 으로 표시
// 클릭 시 해당 페이지로 이동

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_) {
    try { data = { title: '로컬루션', body: event.data ? event.data.text() : '' } } catch {}
  }

  const title = data.title || '로컬루션 알림'
  const body = data.body || ''
  const url = data.url || '/review-admin/naver'
  const tag = data.tag || ('localution-' + Date.now())

  const opts = {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag,
    data: { url },
    requireInteraction: !!data.requireInteraction,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, opts))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/review-admin/naver'

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // 이미 로컬루션 탭이 열려 있으면 focus + navigate
    for (const c of allClients) {
      if (c.url.includes('localution') || c.url.includes('localhost')) {
        c.focus()
        c.navigate(url)
        return
      }
    }
    // 없으면 새 탭
    await self.clients.openWindow(url)
  })())
})
