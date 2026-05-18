// Service Worker – extends cache lifetime for static assets
const CACHE_NAME = 'hra-v1';
const ASSETS_TO_CACHE = [
  '/HRA/',
  '/HRA/assets/css/style.css',
  '/HRA/assets/js/main.js',
  '/HRA/assets/images/hero accounting.avif',
  '/HRA/assets/images/hero analytics.avif',
  '/HRA/assets/images/hero dublin.avif',
  '/HRA/assets/images/banner dublin.jpeg',
  '/HRA/assets/images/medical professionals.avif',
  '/HRA/assets/images/about office.avif',
  '/HRA/assets/images/about team.avif',
  '/HRA/assets/images/avatar sarah.avif',
  '/HRA/assets/images/avatar dr murphy.avif',
  '/HRA/assets/images/avatar patrick.avif',
  '/HRA/assets/images/gallery startup.avif',
  '/HRA/assets/images/gallery tax.avif',
  '/HRA/assets/images/gallery team.avif',
  '/HRA/assets/images/gallery medical.avif'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
