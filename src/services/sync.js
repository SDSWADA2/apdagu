/**
 * ============================================================================
 * OFFLINE-FIRST SYNC ENGINE
 * APDAGU Enterprise v2.0
 * Bi-directional IndexedDB <-> Supabase sync with conflict resolution
 * ============================================================================
 */

import { getSupabase } from './supabase.js';
import { LocalDB } from '../store/db.js';
import { CONFIG } from '../app/config.js';

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.syncListeners = new Set();
    this.bindNetworkEvents();
  }

  bindNetworkEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyStatus('online');
      this.syncPendingQueue();
      this.pullAllTables();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatus('offline');
    });
  }

  async init() {
    await LocalDB.init();
    if (this.isOnline) {
      await this.pullAllTables();
      await this.syncPendingQueue();
    }
  }

  /**
   * Mengirim mutasi (Insert, Update, Delete) dengan strategi Offline-First
   */
  async mutate(table, operation, record) {
    // Pastikan UUID & timestamp ada
    if (!record.id) {
      record.id = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15) + '-' + Date.now());
    }
    record.updated_at = new Date().toISOString();

    // 1. Simpan ke IndexedDB lokal segera (Optimistic UI)
    if (operation === 'delete') {
      await LocalDB.delete(table, record.id);
    } else {
      await LocalDB.put(table, record);
    }

    // 2. Jika online, langsung push ke Supabase
    if (this.isOnline) {
      try {
        const supabase = await getSupabase();
        if (supabase) {
          if (operation === 'insert') {
            const { data, error } = await supabase.from(table).insert(record).select().single();
            if (error) throw error;
            if (data) await LocalDB.put(table, data);
            return data || record;
          } else if (operation === 'update') {
            const { data, error } = await supabase.from(table).update(record).eq('id', record.id).select().single();
            if (error) throw error;
            if (data) await LocalDB.put(table, data);
            return data || record;
          } else if (operation === 'delete') {
            const { error } = await supabase.from(table).delete().eq('id', record.id);
            if (error) throw error;
            return record;
          }
        }
      } catch (err) {
        console.warn(`[SyncEngine] Direct push failed for ${table}, saving to pending queue:`, err.message);
      }
    }

    // 3. Jika offline atau direct push gagal, masukkan ke antrean pending_sync
    await LocalDB.addPendingMutation({
      collection: table,
      operation,
      record
    });

    return record;
  }

  /**
   * Menjalankan sinkronisasi antrean mutasi yang tertunda
   */
  async syncPendingQueue() {
    if (this.isSyncing || !this.isOnline) return;
    this.isSyncing = true;
    this.notifyStatus('syncing');

    try {
      const supabase = await getSupabase();
      if (!supabase) return;

      const queue = await LocalDB.getPendingMutations();
      for (const item of queue) {
        const { queue_id, collection, operation, record } = item;
        try {
          if (operation === 'insert' || operation === 'update') {
            // Upsert with conflict resolution
            await supabase.from(collection).upsert(record, { onConflict: 'id' });
          } else if (operation === 'delete') {
            await supabase.from(collection).delete().eq('id', record.id);
          }
          await LocalDB.removePendingMutation(queue_id);
        } catch (err) {
          console.error(`[SyncEngine] Failed syncing mutation queue item ${queue_id}:`, err);
        }
      }
    } catch (e) {
      console.error('[SyncEngine] Error in syncPendingQueue:', e);
    } finally {
      this.isSyncing = false;
      this.notifyStatus(this.isOnline ? 'synced' : 'offline');
    }
  }

  /**
   * Menarik seluruh data terbaru dari Supabase ke IndexedDB
   */
  async pullAllTables() {
    const supabase = await getSupabase();
    if (!supabase || !this.isOnline) return;

    for (const table of CONFIG.COLLECTIONS) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && Array.isArray(data)) {
          // Merge ke IndexedDB
          await LocalDB.putBulk(table, data);
        }
      } catch (e) {
        console.warn(`[SyncEngine] Pull failed for ${table}:`, e.message);
      }
    }
  }

  notifyStatus(status) {
    for (const listener of this.syncListeners) {
      try {
        listener(status);
      } catch (e) {
        console.error(e);
      }
    }
  }

  onSyncStatusChange(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }
}

export const Sync = new SyncEngine();
