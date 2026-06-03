// 氧气捏捏 service worker — app-shell caching, network-first for API.
const CACHE = 'oxygen-v1'
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Never cache API calls — always go to network.
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) return

  // App shell: cache-first, fall back to network.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      // Only cache successful same-origin GETs.
      if (e.request.method === 'GET' && res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
      }
      return res
    }).catch(() => caches.match('/index.html')))
  )
})
