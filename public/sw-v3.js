// SW V4 - TOTAL NETWORK FIRST PARA HTML
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // NO CACHEAR NADA DE HTML NI MANIFIESTOS
  if (event.request.mode === 'navigate' || event.request.url.includes('manifest') || event.request.url.includes('.json')) {
    event.respondWith(fetch(event.request));
  } else {
    // Para lo demás (imágenes, fuentes), caché si existe o red
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
