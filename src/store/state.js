/**
 * ============================================================================
 * GLOBAL REACTIVE STATE STORE
 * APDAGU Enterprise v2.0
 * In-memory cache + IndexedDB + Realtime + Offline-First Sync
 * ============================================================================
 */

import { LocalDB } from './db.js';
import { Sync } from '../services/sync.js';
import { Realtime } from '../services/realtime.js';
import { CONFIG } from '../app/config.js';

class StateStore {
  constructor() {
    this.data = {};
    this.listeners = new Set();
    this.initDefaults();
  }

  initDefaults() {
    CONFIG.COLLECTIONS.forEach(col => {
      this.data[col] = [];
    });
    this.data.profil_sekolah = {};
    this.data.pengaturan_aplikasi = {};
  }

  async init() {
    await LocalDB.init();
    await this.loadFromLocalDB();

    // Inisialisasi sinkronisasi
    Sync.init().then(() => {
      this.loadFromLocalDB();
    });

    // Inisialisasi realtime changes
    Realtime.init((event) => {
      this.handleRealtimeEvent(event);
    });
  }

  async loadFromLocalDB() {
    for (const col of CONFIG.COLLECTIONS) {
      const records = await LocalDB.getAll(col);
      if (col === 'profil_sekolah') {
        this.data.profil_sekolah = records[0] || {};
      } else if (col === 'pengaturan_aplikasi') {
        const map = {};
        records.forEach(item => { map[item.kunci] = item.nilai; });
        this.data.pengaturan_aplikasi = map;
      } else {
        this.data[col] = records || [];
      }
    }
    this.notify();
  }

  handleRealtimeEvent(event) {
    const { table, action, data } = event;
    if (!this.data[table]) this.data[table] = [];

    if (table === 'profil_sekolah') {
      this.data.profil_sekolah = data || {};
      LocalDB.put(table, data);
    } else if (table === 'pengaturan_aplikasi') {
      if (data?.kunci) this.data.pengaturan_aplikasi[data.kunci] = data.nilai;
      LocalDB.put(table, data);
    } else {
      const index = this.data[table].findIndex(item => item.id === data.id);
      if (action === 'insert') {
        if (index === -1) this.data[table].unshift(data);
        else this.data[table][index] = data;
        LocalDB.put(table, data);
      } else if (action === 'update') {
        if (index !== -1) this.data[table][index] = { ...this.data[table][index], ...data };
        else this.data[table].unshift(data);
        LocalDB.put(table, data);
      } else if (action === 'delete') {
        if (index !== -1) this.data[table].splice(index, 1);
        LocalDB.delete(table, data.id);
      }
    }
    this.notify(table);
  }

  getAll(collection) {
    const list = this.data[collection] || [];
    // Filter non-deleted items by default
    return list.filter(item => !item.is_deleted);
  }

  getById(collection, id) {
    const list = this.data[collection] || [];
    return list.find(item => item.id === id) || null;
  }

  getSchoolProfile() {
    return this.data.profil_sekolah || {};
  }

  getSetting(key, defaultValue = '') {
    return this.data.pengaturan_aplikasi?.[key] || defaultValue;
  }

  async insert(collection, record) {
    if (!record.id) {
      record.id = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 10) + '-' + Date.now());
    }
    record.created_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();
    record.is_deleted = false;

    // Optimistic local update
    if (collection === 'profil_sekolah') {
      this.data.profil_sekolah = record;
    } else {
      if (!this.data[collection]) this.data[collection] = [];
      this.data[collection].unshift(record);
    }

    this.notify(collection);
    return await Sync.mutate(collection, 'insert', record);
  }

  async update(collection, record) {
    record.updated_at = new Date().toISOString();

    // Optimistic local update
    if (collection === 'profil_sekolah') {
      this.data.profil_sekolah = { ...this.data.profil_sekolah, ...record };
    } else {
      const index = this.data[collection]?.findIndex(item => item.id === record.id);
      if (index !== -1) {
        this.data[collection][index] = { ...this.data[collection][index], ...record };
      }
    }

    this.notify(collection);
    return await Sync.mutate(collection, 'update', record);
  }

  async delete(collection, id) {
    const record = this.getById(collection, id) || { id };
    record.is_deleted = true;
    record.updated_at = new Date().toISOString();

    // Optimistic local update (soft delete)
    const index = this.data[collection]?.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[collection].splice(index, 1);
    }

    this.notify(collection);
    return await Sync.mutate(collection, 'delete', record);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changedCollection = null) {
    for (const listener of this.listeners) {
      try {
        listener(this.data, changedCollection);
      } catch (err) {
        console.error('[StateStore] Listener error:', err);
      }
    }
  }
}

export const Store = new StateStore();
export const DB = Store; // Backward compatibility alias
