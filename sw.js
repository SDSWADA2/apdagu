/**
 * ============================================================================
 * SERVICE WORKER v3 — PRODUCTION-READY PWA OFFLINE CACHING
 * SD NEGERI SUMBER WARU 2
 * 
 * Strategi: 
 *   - App Shell (CSS, JS, HTML): Cache-First
 *   - API /api/*: Network-Only (tidak di-cache, selalu fresh)
 *   - CDN Assets (Bootstrap, Chart.js dll): Stale-While-Revalidate
 * ============================================================================
 */

const CACHE_NAME = 'sdn-sw2-guru-v3';

// Seluruh file aplikasi yang di-cache (App Shell)
const APP_SHELL = [
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
  './js/utils/api_client.js',
  './js/utils/gdrive_sync.js',
  './js/state_sync.js',
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

// ============================================================================
// INSTALL: Pre-cache App Shell
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell...');
      return cache.addAll(APP_SHELL);
    }).catch(err => {
      console.warn('[SW] Pre-cache sebagian gagal:', err.message);
    })
  );
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE: Hapus cache versi lama
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Menghapus cache lama:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ============================================================================
// FETCH: Routing Strategy
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API Requests: Network-Only (tidak pernah di-cache)
  //    Supaya data selalu fresh dan konsisten dengan MySQL
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Tidak ada koneksi jaringan. Aplikasi berjalan dalam mode offline.', code: 'OFFLINE' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. App Shell (HTML, JS, CSS lokal): Cache-First, fallback ke Network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          }
          return networkRes;
        }).catch(() => {
          // Fallback ke index.html untuk SPA navigation
          if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
    return;
  }

  // 3. CDN Requests (Bootstrap, Chart.js, dll): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
        }
        return networkRes;
      }).catch(() => null);
      return cached || fetchPromise;
    })
  );
});
