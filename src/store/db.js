/**
 * ============================================================================
 * INDEXEDDB DATABASE ADAPTER — OFFLINE STORAGE ENGINE
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

import { CONFIG } from '../app/config.js';

class IndexedDBAdapter {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('[IndexedDB] Not supported in this environment.');
        return resolve(null);
      }

      const request = indexedDB.open(CONFIG.INDEXEDDB.DB_NAME, CONFIG.INDEXEDDB.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores for each collection
        CONFIG.COLLECTIONS.forEach(collection => {
          if (!db.objectStoreNames.contains(collection)) {
            const store = db.createObjectStore(collection, { keyPath: 'id' });
            store.createIndex('updated_at', 'updated_at', { unique: false });
          }
        });

        // Create pending sync mutations queue
        if (!db.objectStoreNames.contains(CONFIG.INDEXEDDB.MUTATION_STORE)) {
          const queue = db.createObjectStore(CONFIG.INDEXEDDB.MUTATION_STORE, { keyPath: 'queue_id', autoIncrement: true });
          queue.createIndex('timestamp', 'timestamp', { unique: false });
          queue.createIndex('collection', 'collection', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Database opened successfully.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Open error:', event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async getAll(collection) {
    const db = await this.init();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(collection, 'readonly');
        const store = tx.objectStore(collection);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch (e) {
        console.warn(`[IndexedDB] Error getAll ${collection}:`, e.message);
        resolve([]);
      }
    });
  }

  async getById(collection, id) {
    const db = await this.init();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(collection, 'readonly');
        const store = tx.objectStore(collection);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async put(collection, record) {
    const db = await this.init();
    if (!db) return record;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(collection, 'readwrite');
        const store = tx.objectStore(collection);
        const request = store.put(record);
        request.onsuccess = () => resolve(record);
        request.onerror = (e) => reject(e.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async putBulk(collection, records) {
    const db = await this.init();
    if (!db || !records || records.length === 0) return records;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(collection, 'readwrite');
        const store = tx.objectStore(collection);
        records.forEach(r => store.put(r));
        tx.oncomplete = () => resolve(records);
        tx.onerror = (e) => reject(e.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async delete(collection, id) {
    const db = await this.init();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(collection, 'readwrite');
        const store = tx.objectStore(collection);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // ==========================================
  // PENDING SYNC QUEUE OPERATIONS
  // ==========================================
  async addPendingMutation(mutation) {
    const db = await this.init();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(CONFIG.INDEXEDDB.MUTATION_STORE, 'readwrite');
        const store = tx.objectStore(CONFIG.INDEXEDDB.MUTATION_STORE);
        const request = store.add({
          ...mutation,
          timestamp: new Date().toISOString()
        });
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async getPendingMutations() {
    const db = await this.init();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CONFIG.INDEXEDDB.MUTATION_STORE, 'readonly');
        const store = tx.objectStore(CONFIG.INDEXEDDB.MUTATION_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  async removePendingMutation(queueId) {
    const db = await this.init();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(CONFIG.INDEXEDDB.MUTATION_STORE, 'readwrite');
        const store = tx.objectStore(CONFIG.INDEXEDDB.MUTATION_STORE);
        const request = store.delete(queueId);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }
}

export const LocalDB = new IndexedDBAdapter();
