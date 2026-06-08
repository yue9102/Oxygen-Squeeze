// 氧气捏捏 service worker —— 不缓存页面，只负责清掉旧缓存。
// 应用本身依赖网络（调用后端 API），离线缓存意义不大，
// 且缓存 app shell 会导致「更新了还看到旧版」，故此处不做任何缓存。

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// 没有 fetch 处理器 → 所有请求直接走网络，永远拿到最新页面。
