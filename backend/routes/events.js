/**
 * ============================================================================
 * ROUTE: Server-Sent Events (SSE) — Realtime Fallback
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * Digunakan sebagai FALLBACK jika Socket.IO WebSocket tidak dapat terhubung
 * (misal: jaringan sekolah blokir WebSocket, browser lama, dsb).
 *
 * Endpoint: GET /api/events (stream)
 * ============================================================================
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const { verifyToken } = require('../middleware/auth');

/** @type {Set<SSEClient>} semua client SSE yang aktif */
const clients = new Set();

/** @type {import('../socket')} - dihubungkan setelah socket diinit */
let SocketServer = null;

/* ─────────────────────────────────────────────
   SETUP — dipanggil dari server.js setelah init
───────────────────────────────────────────── */
function attachSocketServer(ss) {
  SocketServer = ss;
}

/* ─────────────────────────────────────────────
   HELPER — kirim event SSE ke semua client
───────────────────────────────────────────── */

/**
 * Kirim event ke semua SSE client yang terhubung.
 * @param {string} event  - nama event (misal: 'data_updated')
 * @param {object} data   - payload JSON
 */
function sseEmitAll(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  });
}

/**
 * Kirim event ke semua SSE client KECUALI pengirim.
 */
function sseEmitExcept(excludeId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    if (client.id === excludeId) return;
    try {
      client.res.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  });
}

/* ─────────────────────────────────────────────
   ROUTE: GET /api/events — SSE Stream
───────────────────────────────────────────── */
router.get('/', verifyToken, (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');   // Disable nginx buffering
  res.flushHeaders();

  const clientId = `sse_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const user     = req.user;

  const client = { id: clientId, res, user };
  clients.add(client);

  console.log(`[SSE] ✅ Client connect: ${user?.username || 'anonim'} (${clientId}) | Total: ${clients.size}`);

  // Kirim event pertama (connected) langsung ke client baru
  const connectMsg = `event: connected\ndata: ${JSON.stringify({
    clientId,
    message  : 'SSE Stream terhubung — SDN Sumber Waru 2',
    user     : user ? { username: user.username, role: user.role } : null,
    serverTime: new Date().toISOString(),
  })}\n\n`;
  res.write(connectMsg);

  // Heartbeat: tulis komentar setiap 25 detik agar koneksi tetap hidup
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 25_000);

  // Bersihkan saat client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clients.delete(client);
    console.log(`[SSE] ❌ Client disconnect: ${user?.username || 'anonim'} (${clientId}) | Sisa: ${clients.size}`);
  });
});

/* ─────────────────────────────────────────────
   ROUTE: GET /api/events/status — Monitoring
───────────────────────────────────────────── */
router.get('/status', verifyToken, (req, res) => {
  res.json({
    sseClients   : clients.size,
    socketClients: SocketServer ? SocketServer.getActiveUsers().length : 0,
    timestamp    : new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────── */
module.exports = {
  router,
  sseEmitAll,
  sseEmitExcept,
  attachSocketServer,
  getClientCount: () => clients.size,
};
