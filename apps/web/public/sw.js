// PDC Service Worker — Production-Grade
// Strategies: NetworkFirst (API), CacheFirst (assets), StaleWhileRevalidate (fonts/manifest)
// Background sync for offline telemetry queue via IndexedDB

const CACHE_VERSION = 'pdc-v2.1';
const CACHES = {
  static: `pdc-static-${CACHE_VERSION}`,
  assets: `pdc-assets-${CACHE_VERSION}`,
  api: `pdc-api-${CACHE_VERSION}`,
};

const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/offline.html'];
const NETWORK_TIMEOUT_MS = 5000;

// ─── IndexedDB for offline telemetry queue ───────────────────────────────────

const IDB_NAME = 'pdc-offline';
const IDB_STORE = 'telemetry-queue';
const IDB_VERSION = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueEvents(events) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    events.forEach((ev) => store.add(ev));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function drainQueue() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const all = store.getAll();
    all.onsuccess = () => {
      const events = all.result;
      if (events.length > 0) store.clear();
      tx.oncomplete = () => { db.close(); resolve(events); };
    };
    all.onerror = () => { db.close(); reject(all.error); };
  });
}

async function flushTelemetryQueue() {
  try {
    const events = await drainQueue();
    if (events.length === 0) return;

    const res = await fetch('/api/telemetria/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    if (!res.ok) {
      await enqueueEvents(events); // re-queue on failure
    }
  } catch {
    // Silently fail — will retry on next sync
  }
}

// ─── Caching strategies ───────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timeout);
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'offline', message: 'O teu progresso está guardado. Liga-te à internet para continuar.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? (await fetchPromise) ?? new Response('offline', { status: 503 });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHES.static).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {
      // Gracefully handle missing precache URLs (e.g. offline.html not yet created)
      return caches.open(CACHES.static).then((cache) =>
        cache.addAll(['/', '/index.html', '/manifest.webmanifest'])
      );
    })
  );
  // Do NOT call skipWaiting here — let update flow control activation
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('pdc-') && !Object.values(CACHES).includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

// ─── Message handler ──────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'QUEUE_TELEMETRY' && Array.isArray(payload?.events)) {
    enqueueEvents(payload.events)
      .then(() => {
        if ('sync' in self.registration) {
          return self.registration.sync.register('pdc-telemetry');
        }
      })
      .catch(() => {});
  }
});

// ─── Background sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'pdc-telemetry') {
    event.waitUntil(flushTelemetryQueue());
  }
});

// ─── Fetch handler ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API routes (same-origin /api/*) — NetworkFirst
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHES.api));
    return;
  }

  // Skip cross-origin requests (Edge Worker, external APIs)
  if (url.origin !== self.location.origin) return;

  // Static assets with content hash (immutable) — CacheFirst
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, CACHES.assets));
    return;
  }

  // Fonts and manifest — StaleWhileRevalidate
  if (
    url.pathname.match(/\.(woff2?|ttf|otf|eot)$/) ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHES.static));
    return;
  }

  // HTML navigation — NetworkFirst with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHES.static));
    return;
  }

  // Icons and images — CacheFirst
  if (url.pathname.match(/\.(png|svg|webp|jpg|jpeg|ico|gif)$/)) {
    event.respondWith(cacheFirst(request, CACHES.static));
    return;
  }

  // Default — StaleWhileRevalidate
  event.respondWith(staleWhileRevalidate(request, CACHES.static));
});
