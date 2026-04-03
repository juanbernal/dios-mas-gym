self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for basic PWA functionality
  event.respondWith(fetch(event.request));
});
