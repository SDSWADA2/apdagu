/**
 * ============================================================================
 * SERVICE WORKER — APDAGU ENTERPRISE v2.0
 * Offline Cache & PWA Support — Stale-While-Revalidate Strategy
 * ============================================================================
 */

const CACHE_NAME = 'apdagu-enterprise-v2-cache';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/idcard.css',
  './css/print.css',
  './src/app/app.js',
  './src/app/config.js',
  './src/services/supabase.js',
  './src/services/auth.js',
  './src/services/realtime.js',
  './src/services/storage.js',
  './src/services/sync.js',
  './src/store/db.js',
  './src/store/state.js',
  './src/utils/helpers.js',
  './src/utils/toast.js',
  './src/utils/theme.js',
  './src/utils/security.js',
  './src/utils/camera.js',
  './src/utils/export_utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Abaikan: non-GET, Supabase API, chrome-extension, non-HTTP(S)
  if (
    event.request.method !== 'GET' ||
    url.includes('supabase.co') ||
    !url.startsWith('http')
  ) {
    return;
  }

  // Strategi Stale-While-Revalidate yang benar
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      // Selalu ambil dari network di background untuk update cache
      const networkFetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null); // Saat offline, network fetch akan null

      // Jika ada cache, langsung kembalikan dan perbarui di background
      if (cachedResponse) {
        event.waitUntil(networkFetchPromise);
        return cachedResponse;
      }

      // Jika tidak ada cache, tunggu network
      const networkResponse = await networkFetchPromise;
      return networkResponse || new Response('Offline - Konten tidak tersedia', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});
