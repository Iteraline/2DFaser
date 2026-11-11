/* Service worker de 2DFaser (mismo criterio que Chess).
   - App (página, CSS, JS): red primero; sin red, la copia guardada. Cada despliegue llega solo al abrir con conexión.
   - Fuentes e iconos: caché primero.
   Cambia CACHE solo si cambia la lógica de este archivo. */
const CACHE = 'faser-sw1';
const APP = ['/', '/css/app.css', '/js/app.js', '/js/engine.js', '/js/run.js', '/js/data.js', '/js/render.js', '/js/rng.js', '/js/store.js', '/manifest.json'];
const STATIC = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png',
  '/fonts/bricolage-grotesque-latin-700-normal.woff2', '/fonts/bricolage-grotesque-latin-800-normal.woff2',
  '/fonts/figtree-latin-400-normal.woff2', '/fonts/figtree-latin-700-normal.woff2'];
const cacheable = (res) => res && res.ok && res.status === 200 && !res.redirected && res.type === 'basic';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of [...APP, ...STATIC]) {
      try { const res = await fetch(url, { cache: 'no-store' }); if (cacheable(res)) await cache.put(url, res); } catch (e) { /* sin red */ }
    }
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
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const staticFirst = /^\/(fonts|icons)\//.test(url.pathname);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), path = url.pathname === '/index.html' ? '/' : url.pathname;
    if (staticFirst) { const hit = await cache.match(path); if (hit) return hit; }
    try {
      const res = await fetch(req);
      if (cacheable(res)) cache.put(path, res.clone());
      return res;
    } catch (e) {
      return (await cache.match(path)) || (req.mode === 'navigate' ? cache.match('/') : Response.error());
    }
  })());
});
