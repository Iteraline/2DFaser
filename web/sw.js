/* Service worker de A Lápiz.
   - Todo (página, CSS, JS) va a la red primero; sin red, la copia guardada. Así cada despliegue llega en cuanto hay conexión.
   - Fuentes e iconos: caché primero.
   - VERSION la pone tools/stamp.mjs en cada despliegue; al activarse borra cualquier caché anterior. */
const VERSION = '3';
const CACHE = 'alapiz-' + VERSION;
const STATIC = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png',
  '/fonts/bricolage-grotesque-latin-700-normal.woff2', '/fonts/bricolage-grotesque-latin-800-normal.woff2',
  '/fonts/figtree-latin-400-normal.woff2', '/fonts/figtree-latin-700-normal.woff2'];
const cacheable = (res) => res && res.ok && res.status === 200 && !res.redirected && res.type === 'basic';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of ['/', ...STATIC]) { try { const r = await fetch(url, { cache: 'no-store' }); if (cacheable(r)) await cache.put(url, r); } catch (e) { /* sin red */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const staticFirst = /^\/(fonts|icons)\//.test(url.pathname);
  const key = url.pathname === '/index.html' ? '/' : url.pathname + url.search;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (staticFirst) { const hit = await cache.match(key); if (hit) return hit; }
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (cacheable(res)) cache.put(key, res.clone());
      return res;
    } catch (e) {
      return (await cache.match(key)) || (req.mode === 'navigate' ? cache.match('/') : Response.error());
    }
  })());
});
