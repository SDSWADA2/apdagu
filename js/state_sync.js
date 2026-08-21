/**
 * ============================================================================
 * STATE SYNC & OFFLINE QUEUE MANAGER — PRODUCTION v2
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 *
 * Perbaikan:
 *  - Guard JWT token sebelum mengirim antrean
 *  - Retry dengan exponential backoff (maks 3x)
 *  - Deferred Api listener (tidak bergantung urutan load skrip)
 *  - Toast notifikasi saat sinkronisasi berhasil / gagal
 *  - Emisi pending count update real-time ke UI
 * ============================================================================
 */

const SyncQueue = (function () {
  const DB_NAME = 'SDN_SW2_SYNC_DB';
  const STORE_NAME = 'syncQueue';
  let dbPromise = null;
  let isProcessing = false;
  let _retryCount = 0;
  const MAX_RETRIES = 3;
  const MAX_QUEUE_AGE_DAYS = 7;
  const MAX_QUEUE_ITEMS = 500;
  const listeners = [];

  // ============================================================================
  // IndexedDB Helpers
  // ============================================================================
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'queueId', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  async function addOperation(op) {
    try {
      const db = await openDb();
      const item = {
        op,
        createdAt: new Date().toISOString(),
        retries: 0
      };

      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });

      emitStatus();

      // Coba proses langsung jika online dan server terhubung
      if (navigator.onLine && window.Api && window.Api.isServerConnected) {
        processQueue();
      }
    } catch (err) {
      console.warn('[SyncQueue] Gagal menambahkan ke antrean:', err);
    }
  }

  async function getAllOperations() {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      return [];
    }
  }

  async function removeOperations(queueIds) {
    if (!queueIds || queueIds.length === 0) return;
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        queueIds.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('[SyncQueue] Gagal menghapus antrean terproses:', err);
    }
  }

  async function clearQueue() {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => {
          emitStatus();
          resolve();
        };
        req.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('[SyncQueue] Gagal mengosongkan antrean:', err);
    }
  }

  // ============================================================================
  // Cleanup Stale Data
  // ============================================================================
  async function cleanupStaleData() {
    try {
      const items = await getAllOperations();
      if (items.length === 0) return;

      const now = new Date().getTime();
      const idsToDelete = [];
      
      // Filter items older than MAX_QUEUE_AGE_DAYS
      items.forEach((item, index) => {
        const ageMs = now - new Date(item.createdAt).getTime();
        const daysOld = ageMs / (1000 * 60 * 60 * 24);
        
        // Delete if too old or if index exceeds MAX_QUEUE_ITEMS (keep newest)
        if (daysOld > MAX_QUEUE_AGE_DAYS || (items.length - index > MAX_QUEUE_ITEMS)) {
          idsToDelete.push(item.queueId);
        }
      });

      if (idsToDelete.length > 0) {
        console.log(`[SyncQueue] Membersihkan ${idsToDelete.length} data antrean kadaluwarsa/berlebih...`);
        await removeOperations(idsToDelete);
      }
    } catch (err) {
      console.warn('[SyncQueue] Gagal membersihkan data kadaluwarsa:', err);
    }
  }

  // ============================================================================
  // Core: Process Offline Queue → Send to Backend
  // ============================================================================
  async function processQueue() {
    if (isProcessing) return;
    if (!navigator.onLine) return;

    // Guard: Pastikan token JWT ada sebelum sync
    const token = localStorage.getItem('jwt_token') || '';
    if (!token) {
      console.log('[SyncQueue] Token JWT tidak ada. Antrean ditunda hingga login.');
      return;
    }

    isProcessing = true;
    emitStatus({ syncing: true });

    try {
      const items = await getAllOperations();
      if (!items || items.length === 0) {
        _retryCount = 0;
        isProcessing = false;
        emitStatus({ syncing: false });
        return;
      }

      const changes = items.map(item => item.op);

      if (!window.Api) {
        console.warn('[SyncQueue] ApiClient belum tersedia.');
        return;
      }

      await cleanupStaleData();

      // Implementasi timeout untuk sinkronisasi menggunakan Promise.race (jika Api.syncChanges tidak mendukung signal natively)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sinkronisasi timeout setelah 15 detik')), 15000)
      );

      const result = await Promise.race([
        window.Api.syncChanges(changes),
        timeoutPromise
      ]);

      if (result && result.success) {
        const queueIds = items.map(i => i.queueId);
        await removeOperations(queueIds);
        _retryCount = 0;
        console.log(`[SyncQueue] ✅ Berhasil sync ${changes.length} operasi offline ke server.`);
        if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
          App.showToast(
            'Sinkronisasi Berhasil',
            `${changes.length} perubahan offline berhasil dikirim ke server.`,
            'success'
          );
        }
      } else {
        throw new Error(result?.error || 'Server mengembalikan respons tidak valid.');
      }
    } catch (err) {
      _retryCount++;
      const willRetry = _retryCount <= MAX_RETRIES;
      console.warn(`[SyncQueue] ❌ Gagal sync (percobaan ${_retryCount}/${MAX_RETRIES}):`, err.message);

      if (!willRetry) {
        // Beri tahu pengguna setelah melebihi batas retry
        if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
          App.showToast(
            'Sinkronisasi Gagal',
            'Gagal mengirim data offline ke server. Akan dicoba otomatis saat koneksi pulih.',
            'warning'
          );
        }
        _retryCount = 0;
      } else {
        // Retry dengan exponential backoff
        const backoffMs = Math.min(5000 * Math.pow(2, _retryCount - 1), 60000);
        console.log(`[SyncQueue] Retry dalam ${backoffMs / 1000}s...`);
        setTimeout(() => {
          isProcessing = false;
          processQueue();
        }, backoffMs);
        return; // Jangan reset isProcessing di finally
      }
    } finally {
      isProcessing = false;
      emitStatus({ syncing: false });
    }
  }

  // ============================================================================
  // Status Emitter (UI Badge / Indicator)
  // ============================================================================
  function emitStatus(extra = {}) {
    getAllOperations().then(items => {
      const info = {
        pendingCount: items.length,
        isProcessing,
        ...extra
      };
      listeners.forEach(cb => {
        try { cb(info); } catch (e) {}
      });
    });
  }

  function subscribe(callback) {
    listeners.push(callback);
    emitStatus();
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // ============================================================================
  // Auto-Triggers: Network, Visibility, Periodic, Server Events
  // ============================================================================
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Koneksi pulih. Mencoba proses antrean...');
    setTimeout(() => processQueue(), 1200);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      processQueue();
    }
  });

  // Periodik setiap 30 detik
  setInterval(() => {
    if (navigator.onLine && !isProcessing) {
      processQueue();
    }
  }, 30000);

  // Deferred: Pasang listener ke Api setelah DOM ready (tidak bergantung urutan load skrip)
  function _bindApiListener() {
    if (window.Api && typeof window.Api.subscribe === 'function') {
      window.Api.subscribe((ev) => {
        if (ev.type === 'SERVER_CONNECTED') {
          console.log('[SyncQueue] Server terhubung. Memproses antrean offline...');
          processQueue();
        }
        if (ev.type === 'AUTH_UNAUTHORIZED') {
          console.warn('[SyncQueue] Sesi kedaluwarsa. Antrean ditunda.');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bindApiListener);
  } else {
    // DOM sudah siap
    setTimeout(_bindApiListener, 0);
  }

  // ============================================================================
  // Public API
  // ============================================================================
  return {
    addOperation,
    getAllOperations,
    removeOperations,
    clearQueue,
    processQueue,
    subscribe,
    emitStatus,
    get pendingCount() {
      return getAllOperations().then(items => items.length);
    }
  };
})();

// Expose globally
window.SyncQueue = SyncQueue;
