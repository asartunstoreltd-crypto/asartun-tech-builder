/* ASARTUN TECH BUILDER — service worker.
 *
 * SAFE BY DESIGN. It keeps only PUBLIC STATIC files of this site and touches nothing else:
 *   - never caches cross-origin requests (Supabase: sign-in, learner records, submissions, files, Edge Functions),
 *   - never caches non-GET requests or requests carrying an Authorization header,
 *   - never caches HTML pages (so no page is ever served from a cache to a different user),
 *   - caches only built, versioned files under /assets/ (js, css, fonts, images) plus the offline page and the app icons.
 * Offline, a page load shows /offline.html. The app is NOT usable offline: it needs the network to show any data.
 * Change VERSION to retire old caches on the next release.
 */
const VERSION = 'v1'
const STATIC = 'atb-static-' + VERSION
const OFFLINE = '/offline.html'
const PRECACHE = [OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png']
const ASSET = /^\/assets\/.+\.(?:js|css|woff2?|png|jpe?g|webp|svg)$/i

function shouldHandle(req, origin) {
  if (req.method !== 'GET') return false
  let u
  try { u = new URL(req.url) } catch { return false }
  if (u.origin !== origin) return false
  if (req.headers && typeof req.headers.has === 'function' && req.headers.has('authorization')) return false
  if (req.headers && typeof req.headers.has === 'function' && req.headers.has('range')) return false
  return true
}
function kind(req, origin) {
  if (!shouldHandle(req, origin)) return null
  if (req.mode === 'navigate') return 'navigate'
  const p = new URL(req.url).pathname
  if (ASSET.test(p) || PRECACHE.includes(p)) return 'static'
  return null
}

self.addEventListener('install', (e) => {
  // No skipWaiting here: a new version waits until the person taps "Update", so a lesson is never interrupted.
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('atb-') && k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('message', (e) => {
  const t = e.data && e.data.type
  if (t === 'SKIP_WAITING') self.skipWaiting()
  if (t === 'CLEAR_CACHES') e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))))
})
self.addEventListener('fetch', (e) => {
  const k = kind(e.request, self.location.origin)
  if (k === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE).then((r) => r || new Response('Offline', { status: 503 }))))
  } else if (k === 'static') {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(e.request)
      if (hit) return hit
      const res = await fetch(e.request)
      if (res.status === 200 && res.type === 'basic') c.put(e.request, res.clone())
      return res
    }))
  }
  // everything else: the browser handles it normally (the worker does not intervene)
})
