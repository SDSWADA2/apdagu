/**
 * ============================================================================
 * STATE SYNC & OFFLINE QUEUE MANAGER
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const SyncQueue = (function () {
  const DB_NAME = 'SDN_SW2_SYNC_DB';
  const STORE_NAME = 'syncQueue';
  let dbPromise = null;
  let isProcessing = false;
  const listeners = [];

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
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
        createdAt: new Date().toISOString()
      };

      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });

      emitStatus();
      
      // Coba proses langsung jika sedang online
      if (navigator.onLine && window.Api && window.Api.isServerConnected) {
        processQueue();
      }
    } catch (err) {
      console.warn('[SyncQueue] Gagal menambahkan operasi ke antrean:', err);
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

  async function processQueue() {
    if (isProcessing) return;
    if (!navigator.onLine) return;

    isProcessing = true;
    emitStatus({ syncing: true });

    try {
      const items = await getAllOperations();
      if (!items || items.length === 0) {
        isProcessing = false;
        emitStatus({ syncing: false });
        return;
      }

      const changes = items.map(item => item.op);
      
      if (window.Api) {
        const result = await window.Api.syncChanges(changes);
        if (result && result.success) {
          const queueIds = items.map(i => i.queueId);
          await removeOperations(queueIds);
          console.log(`[SyncQueue] Berhasil menyinkronkan ${changes.length} operasi offline ke backend.`);
        }
      }
    } catch (err) {
      console.warn('[SyncQueue] Gagal memproses antrean sync:', err.message);
    } finally {
      isProcessing = false;
      emitStatus({ syncing: false });
    }
  }

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

  // Auto-listen to network / server events
  window.addEventListener('online', () => {
    setTimeout(() => processQueue(), 1000);
  });

  if (window.Api) {
    window.Api.subscribe((ev) => {
      if (ev.type === 'SERVER_CONNECTED') {
        processQueue();
      }
    });
  }

  return {
    addOperation,
    getAllOperations,
    removeOperations,
    clearQueue,
    processQueue,
    subscribe,
    emitStatus
  };
})();

// Expose globally
window.SyncQueue = SyncQueue;
