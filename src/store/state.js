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
    this.data.pengaturan_aplikasi_records = [];
  }

  async init() {
    await LocalDB.init();
    await this.loadFromLocalDB();

    // Inisialisasi sinkronisasi — setelah selesai, reload dari IndexedDB
    Sync.init().then(async () => {
      await this.loadFromLocalDB();
    });

    // Inisialisasi realtime changes
    Realtime.init((event) => {
      this.handleRealtimeEvent(event);
    });
  }

  async loadFromLocalDB() {
    for (const col of CONFIG.COLLECTIONS) {
      try {
        const records = await LocalDB.getAll(col);
        if (col === 'profil_sekolah') {
          this.data.profil_sekolah = records.length > 0 ? records[0] : {};
        } else if (col === 'pengaturan_aplikasi') {
          const map = {};
          if (records && records.length > 0) {
            records.forEach(item => {
              if (item.kunci) map[item.kunci] = item.nilai;
            });
          }
          this.data.pengaturan_aplikasi = map;
          this.data.pengaturan_aplikasi_records = records || [];
        } else {
          this.data[col] = records || [];
        }
      } catch (e) {
        console.warn(`[Store] loadFromLocalDB error for ${col}:`, e.message);
        this.data[col] = [];
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
      if (data?.kunci) {
        this.data.pengaturan_aplikasi[data.kunci] = data.nilai;
        if (!this.data.pengaturan_aplikasi_records) this.data.pengaturan_aplikasi_records = [];
        const idx = this.data.pengaturan_aplikasi_records.findIndex(r => r.kunci === data.kunci);
        if (idx !== -1) {
          this.data.pengaturan_aplikasi_records[idx] = data;
        } else {
          this.data.pengaturan_aplikasi_records.push(data);
        }
      }
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
    return this.data.pengaturan_aplikasi?.[key] ?? defaultValue;
  }

  async updateSetting(key, value) {
    if (!key) return;

    // Update memory
    if (!this.data.pengaturan_aplikasi) {
      this.data.pengaturan_aplikasi = {};
    }
    this.data.pengaturan_aplikasi[key] = value;

    if (!this.data.pengaturan_aplikasi_records) {
      this.data.pengaturan_aplikasi_records = [];
    }

    let record = this.data.pengaturan_aplikasi_records.find(r => r.kunci === key);
    const isNew = !record;

    if (record) {
      record.nilai = value;
      record.updated_at = new Date().toISOString();
    } else {
      record = {
        id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 10) + '-' + Date.now()),
        kunci: key,
        nilai: value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false
      };
      this.data.pengaturan_aplikasi_records.push(record);
    }

    // Update LocalDB
    await LocalDB.put('pengaturan_aplikasi', record);

    this.notify('pengaturan_aplikasi');

    // FIX: Gunakan flag isNew, bukan perbandingan timestamp yang selalu false
    return await Sync.mutate('pengaturan_aplikasi', isNew ? 'insert' : 'update', record);
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
      if (index !== undefined && index !== -1) {
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
    if (index !== undefined && index !== -1) {
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
