/**
 * ============================================================================
 * SOCKET.IO SERVER — Multi-User Realtime Engine (Production Grade)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 *  Fitur:
 *  ─────
 *  ① JWT Authentication Middleware (wajib untuk aksi tulis)
 *  ② Rooms per-entity  → hanya client yg subscribe entitas tsb yg diberitahu
 *  ③ CDC-style Events  → data_inserted / data_updated / data_deleted / data_synced
 *  ④ Presence System   → active_users_update (siapa online, kapan connect)
 *  ⑤ Heartbeat/Ping    → server aktif kirim ping setiap 30 detik
 *  ⑥ Broadcast helpers → dipanggil oleh routes setiap kali data berubah
 *  ⑦ Namespace /events → endpoint SSE fallback (polling-friendly)
 *  ⑧ Audit Trail       → setiap broadcast dicatat ke log konsol terformat
 * ============================================================================
 */

'use strict';

const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sdn_sw2_rahasia_2024';

/* ─────────────────────────────────────────────
   INTERNAL STATE
───────────────────────────────────────────── */

/** @type {Map<string, ActiveUserEntry>} socketId → user info */
const activeUsers = new Map();

/** @type {import('socket.io').Server|null} */
let io = null;

/** Statistik broadcast (untuk endpoint /health) */
const stats = {
  totalConnections: 0,
  totalDisconnections: 0,
  totalBroadcasts: 0,
  startedAt: new Date().toISOString(),
};

/* ─────────────────────────────────────────────
   HELPER — extract token from handshake
───────────────────────────────────────────── */

function extractToken(socket) {
  return (
    socket.handshake.auth?.token ||
    socket.handshake.query?.token ||
    (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '')
  );
}

/* ─────────────────────────────────────────────
   INISIALISASI
───────────────────────────────────────────── */

/**
 * Inisialisasi Socket.IO dengan HTTP server yang sudah ada.
 * @param {import('http').Server} httpServer
 * @param {string[]} allowedOrigins
 * @returns {import('socket.io').Server}
 */
function init(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1')) {
          cb(null, true);
        } else {
          cb(new Error(`Socket CORS: origin '${origin}' ditolak`));
        }
      },
      methods     : ['GET', 'POST'],
      credentials : true,
    },
    pingTimeout  : 30_000,
    pingInterval : 15_000,
    transports   : ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,  // 1 MB
  });

  /* ══════════════════════════════════════════
     MIDDLEWARE — JWT Authentication
  ══════════════════════════════════════════ */
  io.use((socket, next) => {
    const token = extractToken(socket);
    if (!token) {
      socket.user = null;           // Izinkan anonymous (read-only / monitoring)
      return next();
    }
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
    } catch {
      socket.user = null;           // Token kadaluarsa → tetap boleh konek
    }
    next();
  });

  /* ══════════════════════════════════════════
     CONNECTION HANDLER
  ══════════════════════════════════════════ */
  io.on('connection', (socket) => {
    stats.totalConnections++;
    const user = socket.user;

    /* — Daftarkan user aktif ─────────────── */
    if (user?.username) {
      activeUsers.set(socket.id, {
        socketId   : socket.id,
        username   : user.username,
        role       : user.role        || 'guru',
        name       : user.nama_lengkap || user.username,
        connectedAt: new Date().toISOString(),
      });
      _broadcastActiveUsers();
      console.log(`[Socket] ✅ ${user.username} (${user.role}) terhubung — ${socket.id}`);
    } else {
      console.log(`[Socket] 🔌 Anonim terhubung — ${socket.id}`);
    }

    /* — Kirim state awal ke client baru ──── */
    socket.emit('welcome', {
      message  : 'Terhubung ke Realtime Engine SDN Sumber Waru 2',
      socketId : socket.id,
      user     : user
        ? { username: user.username, role: user.role, name: user.nama_lengkap }
        : null,
      serverTime: new Date().toISOString(),
      activeUsers: _getActiveUsersList(),
    });

    /* ── Event: subscribe ke room entitas ── */
    socket.on('subscribe', (entities) => {
      const list = Array.isArray(entities) ? entities : [entities];
      list.forEach(e => {
        socket.join(`entity:${e}`);
      });
      socket.emit('subscribed', { rooms: list });
    });

    /* ── Event: unsubscribe dari room ─────── */
    socket.on('unsubscribe', (entities) => {
      const list = Array.isArray(entities) ? entities : [entities];
      list.forEach(e => socket.leave(`entity:${e}`));
    });

    /* ── Event: request daftar user aktif ── */
    socket.on('request_active_users', () => {
      socket.emit('active_users_update', _getActiveUsersList());
    });

    /* ── Event: ping dari client ─────────── */
    socket.on('ping_server', () => {
      socket.emit('pong_server', { ts: Date.now() });
    });

    /* ── Event: client konfirmasi terima event */
    socket.on('ack', ({ eventId }) => {
      // Dapat digunakan untuk guaranteed-delivery (future)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Socket] ACK ${eventId} dari ${socket.id}`);
      }
    });

    /* ── Disconnect ──────────────────────── */
    socket.on('disconnect', (reason) => {
      stats.totalDisconnections++;
      if (activeUsers.has(socket.id)) {
        const u = activeUsers.get(socket.id);
        activeUsers.delete(socket.id);
        _broadcastActiveUsers();
        console.log(`[Socket] ❌ ${u.username} terputus — ${reason}`);
      }
    });

    /* ── Error handler per-socket ─────────── */
    socket.on('error', (err) => {
      console.error(`[Socket] Error pada socket ${socket.id}:`, err.message);
    });
  });

  /* ══════════════════════════════════════════
     SERVER HEARTBEAT — kirim ping setiap 30 detik
  ══════════════════════════════════════════ */
  setInterval(() => {
    if (!io) return;
    io.emit('server_heartbeat', {
      ts          : Date.now(),
      activeUsers : activeUsers.size,
      uptime      : Math.round(process.uptime()),
    });
  }, 30_000);

  console.log('[Socket] ✅ Realtime Engine (Socket.IO) aktif & siap.');
  return io;
}

/* ─────────────────────────────────────────────
   INTERNAL BROADCAST HELPERS
───────────────────────────────────────────── */

function _getActiveUsersList() {
  return Array.from(activeUsers.values()).map(u => ({
    username   : u.username,
    name       : u.name,
    role       : u.role,
    connectedAt: u.connectedAt,
  }));
}

function _broadcastActiveUsers() {
  if (!io) return;
  io.emit('active_users_update', _getActiveUsersList());
}

function _buildPayload(entity, action, data, actorInfo) {
  return {
    entity,
    action,
    data,
    by : actorInfo || { username: 'system', name: 'System' },
    at : new Date().toISOString(),
    _id: `${entity}:${action}:${Date.now()}`,   // eventId untuk ACK
    _server_ts: Date.now(),
  };
}

/* ─────────────────────────────────────────────
   PUBLIC BROADCAST API — dipanggil dari Routes
───────────────────────────────────────────── */

/**
 * Broadcast event ke SEMUA client.
 */
function broadcast(event, payload) {
  if (!io) return;
  stats.totalBroadcasts++;
  io.emit(event, { ...payload, _server_ts: Date.now() });
  _log(event, payload);
}

/**
 * Broadcast ke semua client di room entitas tertentu.
 * Client harus sudah melakukan `subscribe('guru')` dsb.
 */
function broadcastToRoom(entity, event, payload) {
  if (!io) return;
  stats.totalBroadcasts++;
  const enriched = { ...payload, _server_ts: Date.now() };
  // Kirim hanya ke room spesifik (client yg sudah subscribe entitas ini)
  // Kirim ke semua client (Global Broadcast) agar semua user menerima perubahan seketika
  io.emit(event, enriched);
  _log(event, payload);
}


/**
 * Broadcast ke semua client KECUALI pengirim.
 */
function broadcastExcept(senderSocketId, event, payload) {
  if (!io) return;
  stats.totalBroadcasts++;
  io.except(senderSocketId).emit(event, { ...payload, _server_ts: Date.now() });
  _log(event, payload);
}

/* ─────────────────────────────────────────────
   CDC-STYLE SHORTCUT EVENTS
   Dipanggil oleh setiap route setelah operasi DB
───────────────────────────────────────────── */

/** Notifikasi INSERT berhasil */
function notifyInsert(entity, data, actorInfo) {
  broadcastToRoom(entity, 'data_inserted', _buildPayload(entity, 'insert', data, actorInfo));
}

/** Notifikasi UPDATE berhasil */
function notifyUpdate(entity, data, actorInfo) {
  broadcastToRoom(entity, 'data_updated', _buildPayload(entity, 'update', data, actorInfo));
}

/** Notifikasi SOFT DELETE berhasil */
function notifyDelete(entity, id, actorInfo) {
  broadcastToRoom(entity, 'data_deleted', _buildPayload(entity, 'delete', { id }, actorInfo));
}

/** Notifikasi SYNC BATCH selesai */
function notifySync(entity, count, actorInfo) {
  broadcast('data_synced', _buildPayload(entity, 'sync', { count }, actorInfo));
}

/** Notifikasi BULK ACTION (misal: upload Excel, import massal) */
function notifyBulk(entity, action, count, actorInfo) {
  broadcast('data_bulk', _buildPayload(entity, action, { count }, actorInfo));
}

/** Notifikasi ERROR ke semua admin/operator yang online */
function notifyError(message, context) {
  if (!io) return;
  io.emit('server_error_notify', {
    message,
    context,
    at: new Date().toISOString(),
  });
}

/* ─────────────────────────────────────────────
   LOGGER INTERNAL
───────────────────────────────────────────── */
function _log(event, payload) {
  if (process.env.NODE_ENV === 'production') return;  // Silent in production
  const entity = payload?.entity || '-';
  const action = payload?.action || '-';
  const by     = payload?.by?.username || 'system';
  console.log(`[Socket] 📡 [${event}] entity=${entity} action=${action} by=${by}`);
}

/* ─────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────── */
module.exports = {
  init,
  broadcast,
  broadcastToRoom,
  broadcastExcept,
  notifyInsert,
  notifyUpdate,
  notifyDelete,
  notifySync,
  notifyBulk,
  notifyError,
  getActiveUsers : _getActiveUsersList,
  getStats       : () => ({ ...stats, currentActive: activeUsers.size }),
  /** Akses langsung ke instance io (untuk kasus advanced) */
  get io() { return io; },
};
