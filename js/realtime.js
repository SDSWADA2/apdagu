/**
 * ============================================================================
 * REALTIME.JS — Multi-User Realtime Client Engine
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * Mengelola:
 *  - Koneksi Socket.IO ke backend
 *  - Auto-refresh tabel saat data berubah dari user lain
 *  - Live badge: Online/Offline/Syncing
 *  - Jumlah user aktif
 *  - Toast notifikasi perubahan dari user lain
 * ============================================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   BRIDGE — Hubungkan RealtimeClient baru (WS+SSE) ke modul lama ini
   Setiap event dari RealtimeClient diteruskan ke sistem refresh yang sudah ada
───────────────────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (typeof window.RealtimeClient === 'undefined') return;

  // Forward semua perubahan data ke DOM event agar module listener yang ada tetap berjalan
  ['data_inserted', 'data_updated', 'data_deleted', 'data_synced'].forEach(ev => {
    window.RealtimeClient.on(ev, (payload) => {
      // Module-level refresh berdasarkan entitas
      const entity = payload?.entity || '';
      if (entity && window.Realtime && typeof window.Realtime._handleDataChange === 'function') {
        window.Realtime._handleDataChange(ev, payload);
      }
    });
  });

  // Aktifkan koneksi RealtimeClient segera
  window.RealtimeClient.connect();
});

const Realtime = (() => {
  // ── Config ──────────────────────────────────────────────────────────────────
  const RECONNECT_DELAY_MS = 3000;
  const SERVER_URL = (() => {
    // Gunakan origin yang sama untuk WebSocket
    const { protocol, hostname, port } = window.location;
    const wsPort = port || (protocol === 'https:' ? '443' : '80');
    return `${protocol}//${hostname}:${wsPort}`;
  })();

  // ── State ────────────────────────────────────────────────────────────────────
  let _socket = null;
  let _isConnected = false;
  let _activeUsers = [];
  let _reconnectTimer = null;

  // ── Entity → Module Reload Mapping ───────────────────────────────────────────
  // Mendefinisikan module mana yang harus di-reload ketika entitas tertentu berubah
  const ENTITY_MODULE_MAP = {
    'guru':            () => _reloadModule('guru'),
    'kepegawaian':     () => _reloadModule('kepegawaian'),
    'pendidikan':      () => _reloadModule('guru'),      // sub-data guru
    'sertifikasi':     () => _reloadModule('guru'),
    'jadwal_mengajar': () => _reloadModule('jadwal'),
    'beban_mengajar':  () => _reloadModule('jadwal'),
    'absensi':         () => _reloadModule('absensi'),
    'pkg':             () => _reloadModule('guru'),
    'prestasi':        () => _reloadModule('guru'),
    'pelatihan':       () => _reloadModule('guru'),
    'dokumen':         () => _reloadModule('guru'),
    'profil_sekolah':  () => _reloadModule('pengaturan'),
    'pengaturan_aplikasi': () => _reloadModule('pengaturan'),
    'all':             () => _reloadAllModules(),
  };

  // ── UI Elements ───────────────────────────────────────────────────────────────
  function _getEl(id) { return document.getElementById(id); }

  // ── Connect ───────────────────────────────────────────────────────────────────
  function connect() {
    // Jika socket.io client belum dimuat, jangan lanjut
    if (typeof io === 'undefined') {
      console.warn('[Realtime] Socket.IO client library belum dimuat. Coba ulang dalam 3 detik...');
      _reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }

    // Ambil token JWT yang sedang aktif
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token') || '';

    _socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionAttempts: Infinity,
    });

    // ── Connection Events ─────────────────────────────────────────────────────
    _socket.on('connect', () => {
      console.log('[Realtime] ✅ Terhubung ke server realtime.');
      _isConnected = true;
      _updateStatusBadge('online');
      _socket.emit('request_active_users');
    });

    _socket.on('disconnect', (reason) => {
      console.warn('[Realtime] ❌ Koneksi terputus:', reason);
      _isConnected = false;
      _updateStatusBadge('offline');
      _updateActiveUserCount(0);
    });

    _socket.on('connect_error', (err) => {
      console.warn('[Realtime] Gagal terhubung:', err.message);
      _isConnected = false;
      _updateStatusBadge('offline');
    });

    // ── Data Events ───────────────────────────────────────────────────────────

    /**
     * Event: Ada data baru ditambahkan oleh user lain.
     * Payload: { entity, action, data, by, at }
     */
    _socket.on('data_inserted', (payload) => {
      console.log('[Realtime] 📥 data_inserted:', payload);
      _handleDataChange(payload, 'insert');
    });

    /**
     * Event: Ada data yang diperbarui oleh user lain.
     */
    _socket.on('data_updated', (payload) => {
      console.log('[Realtime] ✏️ data_updated:', payload);
      _handleDataChange(payload, 'update');
    });

    /**
     * Event: Ada data yang dihapus oleh user lain.
     */
    _socket.on('data_deleted', (payload) => {
      console.log('[Realtime] 🗑️ data_deleted:', payload);
      _handleDataChange(payload, 'delete');
    });

    /**
     * Event: Sinkronisasi batch selesai (offline queue di-flush).
     */
    _socket.on('data_synced', (payload) => {
      console.log('[Realtime] 🔄 data_synced:', payload);
      _handleSyncComplete(payload);
    });

    /**
     * Event: Update daftar user aktif.
     * Payload: array of { username, name, role, connectedAt }
     */
    _socket.on('active_users_update', (users) => {
      _activeUsers = Array.isArray(users) ? users : [];
      _updateActiveUserCount(_activeUsers.length);
    });
  }

  // ── Disconnect ────────────────────────────────────────────────────────────────
  function disconnect() {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
    if (_reconnectTimer) clearTimeout(_reconnectTimer);
  }

  // ── Update JWT Token (setelah login) ──────────────────────────────────────────
  function updateToken(token) {
    if (_socket) {
      // Disconnect dan reconnect dengan token baru
      _socket.auth.token = token;
      _socket.disconnect().connect();
    }
  }

  // ── Internal: Handle Data Change ──────────────────────────────────────────────
  function _handleDataChange(payload, action) {
    const { entity, by, at } = payload;

    // Hanya tampilkan notifikasi jika bukan diri sendiri
    const myUsername = _getMyUsername();
    const changedBy = by?.username || by?.name || 'Pengguna lain';

    if (changedBy !== myUsername) {
      const actionLabel = action === 'insert' ? 'menambahkan' : action === 'update' ? 'memperbarui' : 'menghapus';
      const entityLabel = _entityDisplayName(entity);
      _showLiveToast(`👤 ${changedBy} ${actionLabel} data ${entityLabel}.`, 'info');
    }

    // Auto-refresh modul yang relevan
    _updateStatusBadge('syncing');
    setTimeout(() => {
      const reloadFn = ENTITY_MODULE_MAP[entity] || ENTITY_MODULE_MAP['all'];
      if (reloadFn) reloadFn();
      _updateStatusBadge('online');
    }, 300);
  }

  function _handleSyncComplete(payload) {
    const { entity, count, by } = payload;
    const myUsername = _getMyUsername();
    const changedBy = by?.username || 'Pengguna lain';

    if (changedBy !== myUsername) {
      _showLiveToast(`📡 ${changedBy} menyinkronkan ${count} perubahan (${_entityDisplayName(entity)}).`, 'sync');
    }

    _updateStatusBadge('syncing');
    setTimeout(() => {
      const reloadFn = ENTITY_MODULE_MAP[entity] || ENTITY_MODULE_MAP['all'];
      if (reloadFn) reloadFn();
      _updateStatusBadge('online');
    }, 500);
  }

  // ── Internal: Module Reload ──────────────────────────────────────────────────

  /**
   * Memanggil ulang fungsi render aktif pada modul yang sedang terbuka.
   * Hanya akan me-reload jika modul tersebut sedang aktif/ditampilkan.
   */
  function _reloadModule(moduleName) {
    try {
      // Cek apakah modul ini sedang aktif (panel terlihat)
      const panel = document.querySelector(`[data-section="${moduleName}"], #section-${moduleName}, .section-${moduleName}`);
      if (panel && (panel.style.display === 'none' || panel.classList.contains('d-none'))) {
        // Panel tidak aktif, tandai sebagai "perlu refresh saat dibuka"
        if (window._pendingReloads) window._pendingReloads.add(moduleName);
        return;
      }

      // Coba panggil fungsi render dari modul yang tersedia secara global
      const reloadFunctions = {
        'guru':       ['GuruModule?.loadGuru', 'App?.renderGuru', 'window?.renderGuruTable'],
        'kepegawaian':['App?.renderKepegawaian', 'window?.renderKepegawaian'],
        'jadwal':     ['App?.renderJadwal', 'JadwalModule?.load'],
        'absensi':    ['App?.renderAbsensi', 'AbsensiModule?.load'],
        'pengaturan': ['App?.renderPengaturan', 'PengaturanModule?.load'],
      };

      const fns = reloadFunctions[moduleName] || [];
      let called = false;

      for (const fnPath of fns) {
        try {
          const parts = fnPath.replace(/\?/g, '').split('.');
          let fn = window;
          for (const p of parts) { fn = fn?.[p]; }
          if (typeof fn === 'function') {
            fn();
            called = true;
            break;
          }
        } catch (e) { /* skip */ }
      }

      if (!called) {
        // Fallback: dispatch custom event yang bisa didengarkan oleh app.js
        document.dispatchEvent(new CustomEvent('realtime:reload', {
          detail: { module: moduleName }
        }));
      }
    } catch (e) {
      console.warn('[Realtime] _reloadModule error:', e);
    }
  }

  function _reloadAllModules() {
    ['guru', 'kepegawaian', 'jadwal', 'absensi', 'pengaturan'].forEach(_reloadModule);
  }

  // ── Internal: UI Updates ─────────────────────────────────────────────────────

  function _updateStatusBadge(status) {
    // Update elemen badge di DOM jika ada
    const badge = _getEl('realtime-status-badge');
    const dot = _getEl('realtime-status-dot');
    const text = _getEl('realtime-status-text');

    const states = {
      online:   { label: 'Realtime Connected', dotClass: 'bg-success',   emoji: '🟢' },
      offline:  { label: 'Offline',             dotClass: 'bg-danger',    emoji: '🔴' },
      syncing:  { label: 'Syncing…',            dotClass: 'bg-warning',   emoji: '🟡' },
    };

    const s = states[status] || states.offline;
    if (badge) badge.className = badge.className.replace(/\bbg-\w+\b/g, '') + ' ' + s.dotClass;
    if (dot) dot.className = dot.className.replace(/\bbg-\w+\b/g, '') + ' ' + s.dotClass;
    if (text) text.textContent = s.label;

    // Update status juga di variabel global App jika ada
    if (window.App && typeof App.setRealtimeStatus === 'function') {
      App.setRealtimeStatus(status);
    }
  }

  function _updateActiveUserCount(count) {
    const el = _getEl('active-user-count');
    if (el) el.textContent = count;
  }

  function _showLiveToast(message, type = 'info') {
    // Gunakan App.showToast jika tersedia
    if (window.App && typeof App.showToast === 'function') {
      App.showToast(message, type === 'sync' ? 'info' : type);
      return;
    }

    // Fallback: buat toast sederhana
    const container = document.body;
    const toast = document.createElement('div');
    toast.className = `realtime-toast realtime-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      background: ${type === 'info' ? '#1e40af' : '#065f46'};
      color: #fff; padding: 12px 20px; border-radius: 8px;
      font-size: 13px; max-width: 340px; box-shadow: 0 4px 16px rgba(0,0,0,.3);
      animation: slideInRight .3s ease;
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _getMyUsername() {
    if (window.Auth && typeof Auth.getCurrentUser === 'function') {
      return Auth.getCurrentUser()?.username || '';
    }
    return '';
  }

  function _entityDisplayName(entity) {
    const names = {
      guru: 'Guru', kepegawaian: 'Kepegawaian', pendidikan: 'Pendidikan',
      sertifikasi: 'Sertifikasi', jadwal_mengajar: 'Jadwal', absensi: 'Absensi',
      pkg: 'PKG', prestasi: 'Prestasi', pelatihan: 'Pelatihan',
      dokumen: 'Dokumen', profil_sekolah: 'Profil Sekolah',
      pengaturan_aplikasi: 'Pengaturan', all: 'Semua Data',
    };
    return names[entity] || entity;
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    connect,
    disconnect,
    updateToken,
    get isConnected() { return _isConnected; },
    get activeUsers() { return _activeUsers; },
    get socket() { return _socket; },
  };
})();

// Ekspor global
window.Realtime = Realtime;
