// SW V14 - Cache real de assets estaticos (stale-while-revalidate) + Push Notifications + Release Checker
const CACHE_VERSION = 'dmg-static-v15';

self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  /\.(js|css|webp|png|jpe?g|svg|gif|woff2?|ttf|ico)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API: siempre a la red, nunca cache (datos dinamicos)
  if (url.pathname.startsWith('/api/')) return;

  // Solo cacheamos recursos del mismo origen
  if (url.origin !== self.location.origin) return;

  // Navegacion (HTML): red primero; si no hay conexion, cae al cache o al shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Assets estaticos: stale-while-revalidate (responde del cache al instante si existe,
  // y en paralelo pide la red para refrescar el cache; si no hay red usa lo que haya en cache).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              // Nunca guardar HTML bajo una URL de asset: antes, un chunk viejo que ya
              // no existia respondia con index.html (200) y la seccion quedaba rota
              // hasta borrar la cache.
              const type = response.headers.get('content-type') || '';
              if (response.ok && !type.includes('text/html')) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});

// ── Push Notification Handler ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '🎵 Dios Más Gym', body: 'Nuevo lanzamiento disponible', icon: '/icon-192.png', url: '/admin/proximos-lanzamientos' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      image: data.cover || undefined,
      tag: 'release-notification',
      renotify: true,
      data: { url: data.url || '/admin' }
    })
  );
});

// ── Notification Click: open admin panel ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(targetUrl); }
      else self.clients.openWindow(targetUrl);
    })
  );
});

// ── Message: trigger manual notification from admin panel ─────────────────
self.addEventListener('message', (event) => {
  // Security: only process messages from our own origin
  if (event.origin && event.origin !== self.location.origin) return;
  if (event.data && event.data.type === 'SHOW_RELEASE_NOTIFICATION') {
    const { title, body, cover, url } = event.data;
    self.registration.showNotification(title || '🎶 Lanzamiento Hoy', {
      body: body || 'Un nuevo estreno está disponible ahora.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      image: cover || undefined,
      tag: 'release-' + Date.now(),
      data: { url: url || '/admin/proximos-lanzamientos' }
    });
  }
});
