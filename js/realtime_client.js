/**
 * ============================================================================
 * REALTIME CLIENT — WebSocket (Socket.IO) + SSE Fallback
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 *  Urutan koneksi:
 *  1. Coba WebSocket via Socket.IO (diutamakan — realtime penuh, 2-arah)
 *  2. Jika gagal/timeout → fallback ke SSE  (1-arah, read-only)
 *
 *  Event yang didengarkan:
 *  ─ data_inserted   → tambah baris baru ke UI
 *  ─ data_updated    → update baris di UI
 *  ─ data_deleted    → hapus baris di UI
 *  ─ data_synced     → refresh seluruh entitas
 *  ─ active_users_update → perbarui indikator "Siapa Online"
 *  ─ server_heartbeat    → update status koneksi
 *
 *  Cara pakai:
 *  ─ window.RealtimeClient.on('data_updated', (payload) => { ... })
 *  ─ window.RealtimeClient.subscribe(['guru', 'absensi'])
 *  ─ window.RealtimeClient.isConnected()
 * ============================================================================
 */

'use strict';

(function (global) {

  /* ─────────────────────────────────────────────
     KONSTANTA
  ───────────────────────────────────────────── */
  const SOCKET_CDN    = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
  const RECONNECT_MAX = 5;
  const SSE_URL       = '/api/events';

  /* ─────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────── */
  let _socket      = null;
  let _sseSource   = null;
  let _mode        = 'disconnected';   // 'websocket' | 'sse' | 'disconnected'
  let _wsRetries   = 0;
  let _listeners   = {};               // { eventName: [ fn, fn, ... ] }
  let _activeUsers = [];

  /* ─────────────────────────────────────────────
     HELPER — token dari localStorage / sessionStorage
  ───────────────────────────────────────────── */
  function _getToken() {
    return (
      sessionStorage.getItem('auth_token') ||
      localStorage.getItem('auth_token')   ||
      sessionStorage.getItem('jwt_token')  ||
      localStorage.getItem('jwt_token')    || ''
    );
  }

  /* ─────────────────────────────────────────────
     HELPER — emit ke listener internal
  ───────────────────────────────────────────── */
  function _emit(event, data) {
    (_listeners[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error('[Realtime] Listener error:', e); }
    });
    // Juga dispatch DOM event untuk integrasi dengan kode lama
    try {
      window.dispatchEvent(new CustomEvent(`realtime:${event}`, { detail: data }));
    } catch {}
  }

  /* ─────────────────────────────────────────────
     HANDLER — proses semua incoming events
  ───────────────────────────────────────────── */
  function _handleEvent(event, payload) {
    console.log(`[Realtime][${_mode}] 📥 ${event} | entity=${payload?.entity} | action=${payload?.action}`);
    _emit(event, payload);
    _emit('any_change', { event, payload });
  }

  /* ─────────────────────────────────────────────
     STATUS INDICATOR di UI
  ───────────────────────────────────────────── */
  function _updateStatusUI(status) {
    const el = document.getElementById('realtime-status');
    if (!el) return;
    const map = {
      connected : { text: '🟢 Realtime Online',    cls: 'text-success' },
      sse       : { text: '🟡 Online (SSE Mode)',  cls: 'text-warning' },
      connecting: { text: '🔵 Menghubungkan...',   cls: 'text-info'    },
      offline   : { text: '🔴 Offline',            cls: 'text-danger'  },
    };
    const info = map[status] || map.offline;
    el.textContent  = info.text;
    el.className    = `realtime-status-badge ${info.cls}`;
    el.dataset.mode = _mode;
  }

  /* ─────────────────────────────────────────────
     MODE 1 — WebSocket via Socket.IO
  ───────────────────────────────────────────── */
  function _connectWebSocket() {
    const token = _getToken();
    if (!token) {
      console.warn('[Realtime] Tidak ada token, mencoba SSE fallback...');
      return _connectSSE();
    }

    if (typeof io === 'undefined') {
      // Muat Socket.IO dari CDN
      const script = document.createElement('script');
      script.src   = SOCKET_CDN;
      script.async = true;
      script.onload  = () => _initSocket(token);
      script.onerror = () => {
        console.warn('[Realtime] Socket.IO gagal dimuat dari CDN, fallback ke SSE.');
        _connectSSE();
      };
      document.head.appendChild(script);
      return;
    }
    _initSocket(token);
  }

  function _initSocket(token) {
    const baseUrl = window.location.origin;
    _updateStatusUI('connecting');

    _socket = io(baseUrl, {
      auth           : { token },
      transports     : ['websocket', 'polling'],
      reconnection   : true,
      reconnectionDelay     : 1_000,
      reconnectionDelayMax  : 10_000,
      reconnectionAttempts  : RECONNECT_MAX,
      timeout        : 10_000,
    });

    _socket.on('connect', () => {
      _mode      = 'websocket';
      _wsRetries = 0;
      console.log('[Realtime] ✅ WebSocket terhubung —', _socket.id);
      _updateStatusUI('connected');
      _emit('connected', { mode: 'websocket', socketId: _socket.id });

      // Tutup SSE jika sebelumnya pakai SSE
      if (_sseSource) { _sseSource.close(); _sseSource = null; }
    });

    _socket.on('welcome', (data) => {
      _emit('welcome', data);
      if (data.activeUsers) {
        _activeUsers = data.activeUsers;
        _emit('active_users_update', _activeUsers);
      }
    });

    // ── Perubahan Data ──
    ['data_inserted', 'data_updated', 'data_deleted', 'data_synced', 'data_bulk'].forEach(ev => {
      _socket.on(ev, (payload) => _handleEvent(ev, payload));
    });

    // ── Presence ──
    _socket.on('active_users_update', (users) => {
      _activeUsers = users;
      _emit('active_users_update', users);
    });

    // ── Heartbeat ──
    _socket.on('server_heartbeat', (data) => {
      _emit('heartbeat', data);
    });

    // ── Error/Notifikasi Server ──
    _socket.on('server_error_notify', (data) => {
      _emit('server_error', data);
    });

    // ── Disconnect ──
    _socket.on('disconnect', (reason) => {
      console.warn('[Realtime] WebSocket terputus:', reason);
      _mode = 'disconnected';
      _updateStatusUI('offline');
      _emit('disconnected', { reason });
    });

    // ── Reconnect gagal → fallback SSE ──
    _socket.on('reconnect_failed', () => {
      console.warn('[Realtime] Reconnect WebSocket gagal total, fallback ke SSE.');
      _connectSSE();
    });

    _socket.on('connect_error', (err) => {
      _wsRetries++;
      console.warn(`[Realtime] WebSocket connect error (${_wsRetries}/${RECONNECT_MAX}):`, err.message);
      if (_wsRetries >= RECONNECT_MAX) {
        _socket?.disconnect();
        _connectSSE();
      }
    });
  }

  /* ─────────────────────────────────────────────
     MODE 2 — Server-Sent Events (SSE Fallback)
  ───────────────────────────────────────────── */
  function _connectSSE() {
    if (_sseSource) return;  // Sudah terhubung via SSE

    const token = _getToken();
    if (!token) {
      console.warn('[Realtime] Tidak ada token, SSE tidak bisa terhubung.');
      _updateStatusUI('offline');
      return;
    }

    const url = `${SSE_URL}?token=${encodeURIComponent(token)}`;
    console.log('[Realtime] Mencoba SSE fallback...');
    _updateStatusUI('connecting');

    try {
      _sseSource = new EventSource(url);
    } catch {
      _updateStatusUI('offline');
      return;
    }

    _sseSource.addEventListener('connected', (e) => {
      _mode = 'sse';
      _updateStatusUI('sse');
      const data = JSON.parse(e.data);
      console.log('[Realtime] 🟡 SSE terhubung —', data.clientId);
      _emit('connected', { mode: 'sse', clientId: data.clientId });
    });

    ['data_inserted', 'data_updated', 'data_deleted', 'data_synced'].forEach(ev => {
      _sseSource.addEventListener(ev, (e) => {
        try {
          _handleEvent(ev, JSON.parse(e.data));
        } catch {}
      });
    });

    _sseSource.onerror = () => {
      _mode = 'disconnected';
      _updateStatusUI('offline');
      _emit('disconnected', { reason: 'sse_error' });

      // Coba reconnect SSE setelah 5 detik
      _sseSource?.close();
      _sseSource = null;
      setTimeout(_connectSSE, 5_000);
    };
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */

  const RealtimeClient = {
    /**
     * Inisialisasi koneksi (dipanggil 1x setelah login berhasil).
     */
    connect() {
      if (_mode !== 'disconnected') return;
      _connectWebSocket();
    },

    /**
     * Daftarkan listener untuk event tertentu.
     * @param {string} event
     * @param {Function} fn
     */
    on(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
      return this;
    },

    /**
     * Hapus listener event.
     */
    off(event, fn) {
      if (!_listeners[event]) return this;
      _listeners[event] = _listeners[event].filter(f => f !== fn);
      return this;
    },

    /**
     * Subscribe ke room entitas tertentu (hanya WebSocket).
     * @param {string|string[]} entities
     */
    subscribe(entities) {
      if (_socket?.connected) {
        _socket.emit('subscribe', entities);
      }
      return this;
    },

    /**
     * Emit ping ke server (latency test).
     */
    ping() {
      if (_socket?.connected) {
        const start = Date.now();
        _socket.emit('ping_server');
        _socket.once('pong_server', () => {
          console.log(`[Realtime] RTT: ${Date.now() - start}ms`);
        });
      }
    },

    /** Cek apakah saat ini terhubung */
    isConnected() { return _mode !== 'disconnected'; },

    /** Mode saat ini: 'websocket' | 'sse' | 'disconnected' */
    getMode() { return _mode; },

    /** Daftar user yang sedang online */
    getActiveUsers() { return [..._activeUsers]; },

    /** Putuskan koneksi */
    disconnect() {
      _socket?.disconnect();
      _sseSource?.close();
      _sseSource = null;
      _socket    = null;
      _mode      = 'disconnected';
      _updateStatusUI('offline');
    },
  };

  /* ─────────────────────────────────────────────
     AUTO-CONNECT saat Auth sudah ada
  ───────────────────────────────────────────── */
  window.addEventListener('auth:login_success', () => {
    setTimeout(() => RealtimeClient.connect(), 300);
  });

  // Juga coba connect jika token sudah ada saat halaman dimuat
  window.addEventListener('DOMContentLoaded', () => {
    if (_getToken()) {
      setTimeout(() => RealtimeClient.connect(), 500);
    }
  });

  // Export global
  global.RealtimeClient = RealtimeClient;

})(window);
