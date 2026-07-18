// PDC Service Worker — Production-Grade
// Private APIs: NetworkOnly. Public assets: CacheFirst/StaleWhileRevalidate.
// Background sync for offline telemetry queue via IndexedDB

const CACHE_VERSION = 'pdc-v2.4';
const CACHES = {
  static: `pdc-static-${CACHE_VERSION}`,
  assets: `pdc-assets-${CACHE_VERSION}`,
};
const PRIVATE_CACHE_PREFIXES = ['pdc-api-'];

const PRECACHE_URLS = ['/manifest.webmanifest', '/offline.html'];

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

async function peekQueue() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const all = store.getAll();
    all.onsuccess = () => { db.close(); resolve(all.result); };
    all.onerror = () => { db.close(); reject(all.error); };
  });
}

async function clearQueue() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.clear();
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function purgePrivateData() {
  const purgeCaches = async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => PRIVATE_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)))
        .map((cacheName) => caches.delete(cacheName))
    );
  };
  const results = await Promise.allSettled([purgeCaches(), clearQueue()]);
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('One or more private-data stores could not be purged');
  }
}

async function flushTelemetryQueue() {
  try {
    const events = await peekQueue();
    if (events.length === 0) return;

    const res = await fetch('/api/telemetria/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    if (res.ok) {
      await clearQueue();
    }
  } catch (err) {
    console.warn('[SW] Telemetry flush failed; events remain queued for retry', {
      error: err instanceof Error ? err.name : 'unknown',
    });
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function parseServiceWorkerMessage(data) {
  if (!isRecord(data)) {
    return { ok: false, reason: 'message_data_absent_or_invalid' };
  }

  if (data.type === 'SKIP_WAITING') {
    return { ok: true, type: 'SKIP_WAITING' };
  }

  if (data.type === 'PURGE_PRIVATE_DATA') {
    return { ok: true, type: 'PURGE_PRIVATE_DATA' };
  }

  if (data.type === 'QUEUE_TELEMETRY') {
    const payload = data.payload;
    if (!isRecord(payload) || !Array.isArray(payload.events)) {
      return { ok: false, reason: 'queue_telemetry_payload_invalid' };
    }
    return { ok: true, type: 'QUEUE_TELEMETRY', events: payload.events };
  }

  return { ok: false, reason: 'unknown_message_type' };
}

function parsePushPayload(data) {
  if (!data) {
    return {
      title: 'PDC',
      options: { body: 'Tens uma nova atualização.', data: { url: '/app/notificacoes' } },
    };
  }

  try {
    const payload = data.json();
    const title = typeof payload.title === 'string' && payload.title.length > 0 ? payload.title : 'PDC';
    const body = typeof payload.body === 'string' ? payload.body : 'Tens uma nova atualização.';
    const url = typeof payload.url === 'string' ? payload.url : '/app/notificacoes';
    return {
      title,
      options: {
        body,
        icon: typeof payload.icon === 'string' ? payload.icon : '/icon-192.png',
        badge: typeof payload.badge === 'string' ? payload.badge : '/icon-192.png',
        tag: typeof payload.tag === 'string' ? payload.tag : undefined,
        data: { ...(isRecord(payload.data) ? payload.data : {}), url },
      },
    };
  } catch (err) {
    console.warn('[SW] Invalid push payload', { error: err?.name });
    return {
      title: 'PDC',
      options: { body: 'Tens uma nova atualização.', data: { url: '/app/notificacoes' } },
    };
  }
}

function normalizeNotificationUrl(url) {
  try {
    const target = new URL(url, self.location.origin);
    if (target.origin !== self.location.origin) {
      return new URL('/app/notificacoes', self.location.origin).href;
    }
    return target.href;
  } catch {
    return new URL('/app/notificacoes', self.location.origin).href;
  }
}

async function focusOrOpenClient(url) {
  const targetUrl = normalizeNotificationUrl(url);
  try {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const matching = windowClients.find((client) => client.url === targetUrl);
    if (matching && 'focus' in matching) {
      await matching.focus();
      return;
    }
    for (const client of windowClients) {
      if ('focus' in client) {
        if ('navigate' in client) {
          try {
            const navigatedClient = await client.navigate(targetUrl);
            await (navigatedClient ?? client).focus();
            return;
          } catch (err) {
            console.warn('[SW] Client navigation skipped', { error: err?.name });
          }
        } else {
          await client.focus();
          return;
        }
      }
    }
  } catch (err) {
    console.warn('[SW] Focus attempt failed, falling back to openWindow', { error: err?.name });
  }
  await clients.openWindow(targetUrl);
}

// ─── Caching strategies ───────────────────────────────────────────────────────

async function networkOnly(request) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'offline',
        message: 'Esta funcionalidade precisa de ligação à internet para proteger os teus dados.',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
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
      // Keep installation viable when a public precache resource is unavailable.
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
  const message = parseServiceWorkerMessage(event.data);
  if (!message.ok) {
    console.warn('[SW] Ignoring invalid message', { reason: message.reason });
    return;
  }

  if (message.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (message.type === 'PURGE_PRIVATE_DATA') {
    event.waitUntil(
      purgePrivateData().catch((err) => {
        console.warn('[SW] Failed to purge private data', { error: err?.name });
      })
    );
    return;
  }

  if (message.type === 'QUEUE_TELEMETRY') {
    enqueueEvents(message.events)
      .then(() => {
        if ('sync' in self.registration) {
          return self.registration.sync.register('pdc-telemetry').catch((err) => {
             console.warn('[SW] Failed to register sync', { error: err?.name });
          });
        }
      })
      .catch((err) => {
         console.warn('[SW] Failed to queue telemetry', { error: err?.name, eventCount: message.events.length });
      });
  }
});

// ─── Background sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'pdc-telemetry') {
    event.waitUntil(flushTelemetryQueue());
  }
});

// ─── Web Push ─────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event.data);
  event.waitUntil(self.registration.showNotification(payload.title, payload.options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  const url = isRecord(data) && typeof data.url === 'string' ? data.url : '/app/notificacoes';
  event.waitUntil(focusOrOpenClient(url));
});

// ─── Fetch handler ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Skip Vite dev-server paths (HMR modules, transforms, timestamps)
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) return;

  // API routes are private by default and must never enter Cache Storage.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
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

  // HTML navigation — never serve stale app shell while online.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const offline = await caches.match('/offline.html');
      return offline ?? new Response('offline', { status: 503 });
    }));
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
