// Service Worker – caches all static assets for instant repeat loads
const CACHE_NAME = 'hra-v2';   // ⬅ bumped version to invalidate old cache

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

// Install event – cache fresh files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// Activate event – delete old caches so they don't serve stale files
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())   // take control of all pages
  );
});

// Fetch event – stale-while-revalidate (serve cached, update cache in background)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
      // Return cached response immediately if available, else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
