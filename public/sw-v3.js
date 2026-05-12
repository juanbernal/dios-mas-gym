// SW V11 - Push Notifications + Release Checker
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' || event.request.url.includes('manifest') || event.request.url.includes('.json')) {
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
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

