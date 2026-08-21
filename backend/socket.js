/**
 * ============================================================================
 * SOCKET.IO SERVER — Multi-User Realtime Engine
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * File ini mengelola:
 *  - WebSocket connections via Socket.IO
 *  - Active user tracking (siapa saja yang sedang online)
 *  - Broadcasting perubahan data ke semua client
 *  - JWT Authentication untuk WebSocket
 * ============================================================================
 */

'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sdn_sw2_rahasia_2024';

/** @type {Map<string, {socketId, username, role, name, connectedAt}>} */
const activeUsers = new Map();

/** @type {import('socket.io').Server|null} */
let io = null;

// ============================================================================
// INISIALISASI
// ============================================================================

/**
 * Inisialisasi Socket.IO dengan HTTP server yang sudah ada.
 * @param {import('http').Server} httpServer
 * @param {string[]} allowedOrigins
 * @returns {import('socket.io').Server}
 */
function init(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
  });

  // ── JWT Middleware untuk setiap koneksi ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Izinkan koneksi tanpa auth untuk monitoring publik (status server)
      socket.user = null;
      return next();
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      socket.user = null;
      return next(); // Tetap izinkan, tapi tanpa user info
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Daftarkan user aktif jika sudah login
    if (user && user.username) {
      activeUsers.set(socket.id, {
        socketId: socket.id,
        username: user.username,
        role: user.role || 'unknown',
        name: user.nama_lengkap || user.username,
        connectedAt: new Date().toISOString(),
      });
      // Broadcast daftar user aktif yang diperbarui ke semua client
      _broadcastActiveUsers();
      console.log(`[Socket] ✅ User connected: ${user.username} (${socket.id})`);
    } else {
      console.log(`[Socket] 🔌 Anonymous connection: ${socket.id}`);
    }

    // ── Event: client meminta daftar user aktif ──
    socket.on('request_active_users', () => {
      socket.emit('active_users_update', _getActiveUsersList());
    });

    // ── Disconnect ──
    socket.on('disconnect', (reason) => {
      if (activeUsers.has(socket.id)) {
        const u = activeUsers.get(socket.id);
        console.log(`[Socket] ❌ User disconnected: ${u.username} — ${reason}`);
        activeUsers.delete(socket.id);
        _broadcastActiveUsers();
      } else {
        console.log(`[Socket] 🔌 Anonymous disconnected: ${socket.id}`);
      }
    });
  });

  console.log('[Socket] ✅ Socket.IO Realtime Engine initialized.');
  return io;
}

// ============================================================================
// BROADCAST HELPERS — Dipanggil oleh Routes saat data berubah
// ============================================================================

/**
 * Broadcast event perubahan data ke SEMUA client yang terhubung.
 * @param {string} event    - Nama event (contoh: 'data_updated')
 * @param {object} payload  - Data yang dikirim ke client
 *
 * Payload standar:
 * {
 *   entity: 'guru' | 'absensi' | 'surat' | ...,  // Entitas yang berubah
 *   action: 'insert' | 'update' | 'delete',
 *   data: { id, ... },                            // Data lengkap / partial
 *   by: { username, name },                       // Siapa yang mengubah
 *   at: '2026-08-21T10:00:00Z',                   // Kapan perubahan terjadi
 * }
 */
function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, { ...payload, _server_ts: Date.now() });
}

/**
 * Broadcast perubahan data ke semua client kecuali pengirim.
 * @param {string} senderSocketId
 * @param {string} event
 * @param {object} payload
 */
function broadcastExcept(senderSocketId, event, payload) {
  if (!io) return;
  io.except(senderSocketId).emit(event, { ...payload, _server_ts: Date.now() });
}

// ============================================================================
// SHORTCUT EVENTS — API bersih untuk digunakan di routes
// ============================================================================

/**
 * Notify semua client bahwa data sebuah entitas berhasil ditambahkan.
 */
function notifyInsert(entity, data, actorInfo) {
  broadcast('data_inserted', { entity, action: 'insert', data, by: actorInfo, at: new Date().toISOString() });
}

/**
 * Notify semua client bahwa data sebuah entitas berhasil diperbarui.
 */
function notifyUpdate(entity, data, actorInfo) {
  broadcast('data_updated', { entity, action: 'update', data, by: actorInfo, at: new Date().toISOString() });
}

/**
 * Notify semua client bahwa data sebuah entitas berhasil dihapus (soft delete).
 */
function notifyDelete(entity, id, actorInfo) {
  broadcast('data_deleted', { entity, action: 'delete', data: { id }, by: actorInfo, at: new Date().toISOString() });
}

/**
 * Notify semua client bahwa sinkronisasi batch selesai.
 */
function notifySync(entity, count, actorInfo) {
  broadcast('data_synced', { entity, action: 'sync', count, by: actorInfo, at: new Date().toISOString() });
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function _getActiveUsersList() {
  return Array.from(activeUsers.values()).map(u => ({
    username: u.username,
    name: u.name,
    role: u.role,
    connectedAt: u.connectedAt,
  }));
}

function _broadcastActiveUsers() {
  if (!io) return;
  io.emit('active_users_update', _getActiveUsersList());
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  init,
  broadcast,
  broadcastExcept,
  notifyInsert,
  notifyUpdate,
  notifyDelete,
  notifySync,
  getActiveUsers: _getActiveUsersList,
  /** Akses langsung ke instance io (untuk kasus advanced) */
  get io() { return io; },
};
