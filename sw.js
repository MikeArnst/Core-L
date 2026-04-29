const CACHE_NAME = 'core-l-cache-v1';
const urlsToCache = [
  '/Core-L/',
  '/Core-L/index.html',
  '/Core-L/manifest.json',
  '/Core-L/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Gibt die Cache-Version zurück oder lädt sie frisch aus dem Netz
        return response || fetch(event.request);
      })
  );
});