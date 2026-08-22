/**
 * ============================================================================
 * STATE MANAGEMENT & DATABASE ENGINE LENGKAP
 * APLIKASI DATABASE GURU SD NEGERI SUMBER WARU 2 (KAB. PAMEKASAN)
 * (MODE 100% ONLINE - NO INDEXEDDB)
 * ============================================================================
 */

const APP_STORAGE_KEY = 'SDN_SUMBER_WARU_2_GURU_DB_v3_ONLINE';

// Seed Avatar Generator (SVG Data URI)
function generateAvatar(name, bg = '#2563eb') {
  const initials = typeof Helpers !== 'undefined' ? Helpers.getInitials(name) : (name ? name.slice(0, 2).toUpperCase() : 'SD');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="${bg}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="46" font-weight="700">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

class AppState {
  constructor() {
    this.state = {};
    this.listeners = [];
    this.syncChannel = null;
    this.initSyncChannel();
    this.ensureDefaults();
  }

  ensureDefaults() {
    const collections = [
      'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
      'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'users', 'audit_logs'
    ];
    collections.forEach(col => {
      if (!this.state[col]) this.state[col] = [];
    });
    if (!this.state.profil_sekolah) this.state.profil_sekolah = {};
    if (!this.state.pengaturan_aplikasi) this.state.pengaturan_aplikasi = {};
    if (!this.state.konfigurasi_sistem) this.state.konfigurasi_sistem = {};
    if (!this.state.pengaturan_absensi) this.state.pengaturan_absensi = {};
    if (!this.state.integrasi) this.state.integrasi = {};
  }

  initSyncChannel() {
    try {
      this.syncChannel = new BroadcastChannel('sdn_sw2_sync');
      this.syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATED') {
          this.state = event.data.payload;
          this.notify();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel tidak didukung di browser ini.');
    }
  }

  generateId() {
    return typeof Helpers !== 'undefined' ? Helpers.generateId() : Date.now();
  }

  logActivity(action, module, details) {
    if (!this.state.audit_logs) this.state.audit_logs = [];
    
    // Gunakan fungsi dari auth.js jika tersedia
    const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : { username: 'system', role: 'system' };
    
    this.state.audit_logs.unshift({
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action: action,
      module: module,
      details: details,
      user: user ? user.username : 'system',
      role: user ? user.role : 'system',
      ip_address: 'Lokal'
    });
    
    if (this.state.audit_logs.length > 200) {
      this.state.audit_logs = this.state.audit_logs.slice(0, 200);
    }
  }

  /**
   * Mengirim event ke Backend (API)
   * Jika gagal, aplikasi dianggap offline dan perubahan UI akan di-rollback dengan menarik ulang data.
   */
  _dispatchApiMutation(op, collection, rawData) {
    if (!navigator.onLine) {
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Koneksi Terputus', 'Anda sedang offline. Perubahan dibatalkan.', 'danger');
      }
      this.pullAllFromBackend(); // Rollback local state
      return;
    }

    const token = localStorage.getItem('jwt_token') || '';
    if (!token) return;

    let endpoint = `/api/data/${collection}`;
    let method = 'POST';
    let data = rawData;

    if (op === 'update') {
      endpoint = `/api/data/${collection}/${rawData.id}`;
      method = 'PUT';
    } else if (op === 'delete') {
      endpoint = `/api/data/${collection}/${rawData.id}`;
      method = 'DELETE';
      data = null;
    } else if (op === 'insert' && collection === 'users') {
      endpoint = '/api/auth/register';
    }

    const promise = method === 'DELETE'
      ? window.Api.delete(endpoint)
      : method === 'POST'
        ? window.Api.post(endpoint, data)
        : window.Api.put(endpoint, data);

    promise
      .then((res) => {
        if (!res.success) {
          throw new Error(res.error || 'Server error');
        }
      })
      .catch(err => {
        console.warn(`[DB] Gagal mengirim ${op}(${collection}) ke backend:`, err.message);
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('Gagal Menyimpan', `Gagal menyimpan ke server: ${err.message}`, 'danger');
        }
        // Rollback optimistic update
        this.pullAllFromBackend();
      });
  }

  /**
   * Tarik seluruh data terbaru dari Backend Server ke State Lokal
   */
  async pullAllFromBackend() {
    if (!navigator.onLine) {
      throw new Error('Tidak ada koneksi internet. Aplikasi 100% online.');
    }
    if (!window.Api) throw new Error('ApiClient tidak tersedia.');
    const res = await window.Api.getAllState();
    if (!res || !res.success || !res.data) throw new Error('Format data server tidak valid.');

    const serverState = res.data;
    const collections = [
      'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
      'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'
    ];
    collections.forEach(col => {
      if (Array.isArray(serverState[col])) {
        this.state[col] = serverState[col];
      }
    });

    if (serverState.profil_sekolah) this.state.profil_sekolah = serverState.profil_sekolah;
    if (serverState.pengaturan_aplikasi) this.state.pengaturan_aplikasi = serverState.pengaturan_aplikasi;
    if (serverState.konfigurasi_sistem) this.state.konfigurasi_sistem = serverState.konfigurasi_sistem;
    if (serverState.pengaturan_absensi) this.state.pengaturan_absensi = serverState.pengaturan_absensi;
    if (serverState.integrasi) this.state.integrasi = serverState.integrasi;

    if (Array.isArray(serverState.users)) {
      this.state.users = serverState.users;
    }

    console.log('[DB] Berhasil menarik state dari Backend Server.');
    this.saveState(this.state, true);
  }

  async loadState() {
    try {
      this.ensureDefaults();
      // Murni dari API
      if (window.Api && navigator.onLine) {
        await this.pullAllFromBackend();
      } else if (!navigator.onLine) {
        throw new Error("Koneksi Internet Terputus");
      }
    } catch (err) {
      console.error('Aplikasi membutuhkan koneksi internet.', err);
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Offline', 'Tidak dapat memuat data. Periksa koneksi internet Anda.', 'danger');
      }
    }
  }

  saveState(newState = this.state, skipBroadcast = false) {
    this.state = newState;
    
    if (!skipBroadcast && this.syncChannel) {
      try {
        this.syncChannel.postMessage({
          type: 'STATE_UPDATED',
          payload: this.state
        });
      } catch (e) {
        console.warn('Gagal mem-broadcast state:', e);
      }
    }
    
    this.notify();
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.state); } catch (e) { console.error('Error in state listener:', e); }
    });
  }

  subscribe(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  getAll(collection) {
    const list = this.state[collection] || [];
    return list.filter(item => !item.is_deleted);
  }

  getById(collection, id) {
    return (this.state[collection] || []).find(item => item.id == id && !item.is_deleted);
  }

  insert(collection, item, logMessage = '') {
    if (!this.state[collection]) this.state[collection] = [];
    const newItem = { ...item, id: item.id || this.generateId() };
    
    this.state[collection].unshift(newItem);
    
    if (logMessage) {
      this.logActivity('Tambah Data', collection, logMessage);
    }
    this.saveState();
    this._dispatchApiMutation('insert', collection, newItem);

    return newItem;
  }

  add(collection, item, logMessage = '') {
    return this.insert(collection, item, logMessage);
  }

  update(collection, id, updatedFields, logMessage = '') {
    if (!this.state[collection]) return null;
    const index = this.state[collection].findIndex(item => item.id == id);
    if (index !== -1) {
      this.state[collection][index] = {
        ...this.state[collection][index],
        ...updatedFields
      };

      const updatedItem = this.state[collection][index];

      if (logMessage) {
        this.logActivity('Ubah Data', collection, logMessage);
      }
      this.saveState();
      this._dispatchApiMutation('update', collection, updatedItem);

      return updatedItem;
    }
    return null;
  }

  delete(collection, id, logMessage = '') {
    if (!this.state[collection]) return false;
    const initialLength = this.state[collection].length;
    this.state[collection] = this.state[collection].filter(item => item.id != id);
    
    if (collection === 'guru') {
      const childCollections = ['kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen'];
      childCollections.forEach(col => {
        if (this.state[col]) {
          this.state[col] = this.state[col].filter(item => item.guru_id != id);
        }
      });
    }

    if (this.state[collection].length < initialLength) {
      if (logMessage) {
        this.logActivity('Hapus Data', collection, logMessage);
      }
      this.saveState();
      this._dispatchApiMutation('delete', collection, { id });
      return true;
    }
    return false;
  }

  applyRealtimeChange(change) {
    if (!change || !change.action || !change.table || !change.data) return;
    const { action, table, data } = change;
    if (!this.state[table]) this.state[table] = [];

    let changed = false;

    if (action === 'insert') {
      const exists = this.state[table].find(item => item.id == data.id);
      if (!exists) {
        this.state[table].unshift(data);
        changed = true;
      }
    } else if (action === 'update') {
      const index = this.state[table].findIndex(item => item.id == data.id);
      if (index !== -1) {
        this.state[table][index] = { ...this.state[table][index], ...data };
        changed = true;
      }
    } else if (action === 'delete') {
      const initialLen = this.state[table].length;
      this.state[table] = this.state[table].filter(item => item.id != data.id);
      if (this.state[table].length < initialLen) changed = true;
    }

    if (changed) {
      this.saveState(this.state, true);
    }
  }

  exportJSON() {
    const exportData = {
      version: '3.0',
      export_date: new Date().toISOString(),
      data: this.state
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Backup_DB_Guru_SDNSW2_${Helpers.formatDate(new Date(), 'YYYYMMDD_HHmm')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.data) {
        this.state = parsed.data;
        this.ensureDefaults();
        this.saveState();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Gagal mengimpor JSON:', e);
      return false;
    }
  }

  getSingle(key) {
    return this.state[key] || {};
  }

  updateSingle(key, data, logMessage = '') {
    this.state[key] = { ...this.state[key], ...data };
    if (logMessage) {
      this.logActivity('Ubah Pengaturan', key, logMessage);
    }
    this.saveState();
    
    // Dispatch ke API
    this._dispatchApiMutation('update', key, this.state[key]);
  }
}

// Inisialisasi Database
window.DB = new AppState();

// ============================================================================
// Listener global: setelah realtime pull selesai, re-render modul yang aktif
// ============================================================================
window.addEventListener('realtime:pull_complete', () => {
  if (typeof App !== 'undefined' && typeof App.reRenderCurrentView === 'function') {
    App.reRenderCurrentView();
  }
});
