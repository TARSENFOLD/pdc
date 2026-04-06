const CACHE_NAME = 'pdc-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request) as Promise<Response>)
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});
