/**
 * ============================================================================
 * SERVICE WORKER — APDAGU ENTERPRISE v2.0
 * Offline Cache & PWA Support
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
  // Ignore Supabase realtime websocket / non-GET / non-HTTP(S) extensions
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co') || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
