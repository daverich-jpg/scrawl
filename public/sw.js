// Scrawl service worker: installable + opens offline.
// Pages are network-first (a fresh deploy always wins when online); hashed assets and fonts are cache-first.
// All paths are relative to this file, so it works under /scrawl/ on GitHub Pages.
const CACHE = 'scrawl-v2'
const ROOT = new URL('./', self.location).href
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'].map(
  (p) => new URL(p, ROOT).href,
)

// Precache the shell plus the hashed JS/CSS the current page points at, so the very first launch works offline.
self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE)
      // `reload` skips the browser's HTTP cache, so a fresh deploy is never precached from a stale copy.
      const fresh = (url) => new Request(url, { cache: 'reload' })
      await c.addAll(SHELL.map(fresh))
      const html = await (await c.match(ROOT)).text()
      const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => new URL(m[1], ROOT).href)
      await c.addAll(assets.map(fresh))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  const isFont = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com'
  if (req.method !== 'GET' || (url.origin !== location.origin && !isFont)) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(ROOT, copy))
          return res
        })
        .catch(() => caches.match(ROOT)),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
