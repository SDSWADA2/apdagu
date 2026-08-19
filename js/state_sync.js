/*
  Simple IndexedDB-backed sync queue helper for the frontend.
  Usage:
    SyncQueue.addOperation({ op: 'insert', table: 'guru', data: {...}, tempId: 't-123' })
    SyncQueue.processQueue() // manually or triggered on navigator.onLine
*/
const SyncQueue = (function () {
  const DB_NAME = 'app-db-v1';
  const STORE_NAME = 'syncQueue';
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  async function addOperation(op) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add({ op, createdAt: new Date().toISOString() });
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAllOperations() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function removeOperations(ids) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      let deleted = 0;
      ids.forEach(id => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function processQueue() {
    if (!navigator.onLine) return;
    const ops = await getAllOperations();
    if (!ops.length) return;

    // Map payload
    const changes = ops.map(item => item.op);
    try {
      const resp = await fetch('/api/sync/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // include cookies for refresh token
        body: JSON.stringify({ clientId: window._CLIENT_ID || null, changes })
      });
      if (!resp.ok) throw new Error('Sync failed');
      const json = await resp.json();
      // On success, remove processed queue items
      const ids = ops.map(o => o.id);
      await removeOperations(ids);
      // Optionally apply server mapping to local state (e.g., update tempId to real id)
      if (json && json.results) {
        // implement mapping handler if needed
        console.log('Sync results:', json.results);
      }
    } catch (err) {
      console.warn('Failed to process sync queue:', err);
    }
  }

  // Auto-run on online
  window.addEventListener('online', () => {
    console.log('Back online — processing sync queue');
    processQueue();
  });

  return {
    addOperation,
    getAllOperations,
    removeOperations,
    processQueue
  };
})();

// Expose globally for existing code to call
window.SyncQueue = SyncQueue;
