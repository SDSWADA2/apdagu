/**
 * ============================================================================
 * SERVICE WORKER (PWA OFFLINE CACHING)
 * SD NEGERI SUMBER WARU 2
 * ============================================================================
 */

const CACHE_NAME = 'sdn-sw2-guru-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/idcard.css',
  './css/print.css',
  './js/utils/helpers.js',
  './js/utils/export_utils.js',
  './js/utils/theme.js',
  './js/utils/toast.js',
  './js/utils/router.js',
  './js/state.js',
  './js/auth.js',
  './js/modules/dashboard.js',
  './js/modules/guru.js',
  './js/modules/pendidikan.js',
  './js/modules/sertifikasi.js',
  './js/modules/kepegawaian.js',
  './js/modules/jadwal.js',
  './js/modules/beban_mengajar.js',
  './js/modules/absensi.js',
  './js/modules/pkg.js',
  './js/modules/prestasi.js',
  './js/modules/pelatihan.js',
  './js/modules/dokumen.js',
  './js/modules/laporan.js',
  './js/modules/pengaturan.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching offline assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Abaikan error jaringan saat offline
      });
      
      // Kembalikan cache secepatnya, atau tunggu network jika tidak ada cache
      return cachedResponse || fetchPromise;
    })
  );
});
