const CACHE_NAME = 'pdc-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não interceptar requisições para o BFF (porta 3001 ou qualquer origem diferente)
  if (url.origin !== self.location.origin) {
    return; 
  }

  // Apenas cachear assets estáticos da mesma origem
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
