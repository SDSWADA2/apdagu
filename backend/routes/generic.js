/**
 * ============================================================================
 * ROUTE: Generic CRUD — Production Realtime Version
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 *  Handler generik untuk semua entitas (kepegawaian, pendidikan, sertifikasi,
 *  absensi, pkg, prestasi, pelatihan, dokumen, dsb).
 *
 *  Setiap operasi tulis otomatis:
 *  ① Tulis ke MySQL
 *  ② Broadcast via WebSocket (Socket.IO)
 *  ③ Broadcast via SSE fallback
 *  ④ updated_by / created_by diisi dari JWT
 * ============================================================================
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const pool         = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');
const { sseEmitAll } = require('./events');

/* ─────────────────────────────────────────────
   TABLE MAPPING & WHITELIST
───────────────────────────────────────────── */
const tableMapping = {
  guru               : 'guru',
  kepegawaian        : 'kepegawaian',
  pendidikan         : 'pendidikan',
  riwayat_pendidikan : 'pendidikan',
  sertifikasi        : 'sertifikasi',
  jadwal_mengajar    : 'jadwal_mengajar',
  jadwal             : 'jadwal_mengajar',
  beban_mengajar     : 'beban_mengajar',
  beban              : 'beban_mengajar',
  absensi            : 'absensi',
  pkg                : 'pkg',
  penilaian_kinerja_guru: 'pkg',
  prestasi           : 'prestasi',
  prestasi_guru      : 'prestasi',
  pelatihan          : 'pelatihan',
  pelatihan_guru     : 'pelatihan',
  dokumen            : 'dokumen',
  dokumen_guru       : 'dokumen',
  audit_logs         : 'audit_logs',
  profil_sekolah     : 'profil_sekolah',
  pengaturan_aplikasi: 'pengaturan_aplikasi',
  pengaturan         : 'pengaturan_aplikasi',
  users              : 'users',
};

const whitelistedTables = new Set([
  'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
  'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen',
  'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi', 'users',
]);

// Tabel yang tidak punya kolom is_deleted
const NO_SOFT_DELETE = new Set(['users', 'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi']);

/* ─────────────────────────────────────────────
   MIDDLEWARE
───────────────────────────────────────────── */
router.use(verifyToken);

const validateTable = (req, res, next) => {
  const key      = req.params.table;
  const resolved = tableMapping[key] || key;
  if (!whitelistedTables.has(resolved)) {
    return res.status(403).json({ error: `Akses ke tabel '${resolved}' tidak diizinkan.`, code: 'TABLE_FORBIDDEN' });
  }
  req.tableName = resolved;
  next();
};
router.use('/:table', validateTable);

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getActor(req) {
  return {
    username: req.user?.username || 'system',
    name    : req.user?.nama_lengkap || req.user?.username || 'System',
  };
}

/**
 * Emit perubahan data ke WebSocket + SSE secara bersamaan.
 */
function emitChange(eventName, entity, action, data, actor) {
  const payload = { entity, action, data, by: actor, at: new Date().toISOString() };
  try {
    switch (action) {
      case 'insert': SocketServer.notifyInsert(entity, data, actor); break;
      case 'update': SocketServer.notifyUpdate(entity, data, actor); break;
      case 'delete': SocketServer.notifyDelete(entity, data.id, actor); break;
      default      : SocketServer.broadcast(eventName, payload);
    }
  } catch (e) { /* WebSocket opsional */ }
  try { sseEmitAll(eventName, payload); } catch (e) { /* SSE opsional */ }
}

/* ─────────────────────────────────────────────
   GET /api/data/:table
───────────────────────────────────────────── */
router.get('/:table', async (req, res) => {
  try {
    const { guru_id, limit = 500, offset = 0 } = req.query;
    let query = `SELECT * FROM \`${req.tableName}\` WHERE 1=1`;
    const params = [];

    if (!NO_SOFT_DELETE.has(req.tableName)) {
      query += ' AND is_deleted = 0';
    }
    if (guru_id && !NO_SOFT_DELETE.has(req.tableName)) {
      query += ' AND guru_id = ?';
      params.push(parseInt(guru_id));
    }
    query += req.tableName === 'audit_logs' ? ' ORDER BY created_at DESC' : ' ORDER BY id DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    if (req.tableName === 'users') {
      const safe = rows.map(({ password_hash, ...rest }) => rest);
      return res.json({ data: safe, table: req.tableName, total: safe.length });
    }
    res.json({ data: rows, table: req.tableName, total: rows.length });
  } catch (err) {
    console.error(`[GENERIC] GET ${req.tableName} error:`, err);
    res.status(500).json({ error: `Gagal mengambil data ${req.tableName}.` });
  }
});

/* ─────────────────────────────────────────────
   GET /api/data/:table/:id
───────────────────────────────────────────── */
router.get('/:table/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query = `SELECT * FROM \`${req.tableName}\` WHERE id = ?`;
    if (!NO_SOFT_DELETE.has(req.tableName)) query += ' AND is_deleted = 0';
    query += ' LIMIT 1';

    const [rows] = await pool.query(query, [id]);
    if (!rows.length) return res.status(404).json({ error: `Data ${req.tableName} tidak ditemukan.` });

    const row = rows[0];
    if (req.tableName === 'users') delete row.password_hash;
    res.json({ data: row });
  } catch (err) {
    console.error(`[GENERIC] GET detail ${req.tableName} error:`, err);
    res.status(500).json({ error: `Gagal mengambil detail ${req.tableName}.` });
  }
});

/* ─────────────────────────────────────────────
   POST /api/data/:table
───────────────────────────────────────────── */
router.post('/:table', async (req, res) => {
  try {
    const actor  = getActor(req);
    const body   = req.body;

    let fields = Object.keys(body).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    if (!fields.length) return res.status(400).json({ error: 'Tidak ada data valid untuk disisipkan.' });

    // Tambahkan created_by / updated_by jika tidak ada di body
    if (!NO_SOFT_DELETE.has(req.tableName)) {
      if (!fields.includes('created_by')) { fields.push('created_by'); body.created_by = actor.username; }
      if (!fields.includes('updated_by')) { fields.push('updated_by'); body.updated_by = actor.username; }
    }

    const cols   = fields.map(f => `\`${f}\``).join(', ');
    const pholds = fields.map(() => '?').join(', ');
    const values = fields.map(f => body[f]);

    const [result] = await pool.query(
      `INSERT INTO \`${req.tableName}\` (${cols}) VALUES (${pholds})`,
      values
    );
    const newData = { id: result.insertId, ...body };

    // 📡 Realtime Broadcast
    emitChange('data_inserted', req.tableName, 'insert', newData, actor);

    res.status(201).json({ message: `Data berhasil ditambahkan ke ${req.tableName}`, insertId: result.insertId, data: newData });
  } catch (err) {
    console.error(`[GENERIC] POST ${req.tableName} error:`, err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Data duplikat. Nilai unik sudah ada.' });
    res.status(500).json({ error: `Gagal menambah data ke ${req.tableName}.` });
  }
});

/* ─────────────────────────────────────────────
   PUT /api/data/:table/:id
───────────────────────────────────────────── */
router.put('/:table/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const actor  = getActor(req);
    const body   = req.body;

    let fields = Object.keys(body).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    if (!fields.length) return res.status(400).json({ error: 'Tidak ada data valid untuk diperbarui.' });

    // Tambahkan updated_by
    if (!NO_SOFT_DELETE.has(req.tableName) && !fields.includes('updated_by')) {
      fields.push('updated_by');
      body.updated_by = actor.username;
    }

    const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values     = [...fields.map(f => body[f]), id];

    const [result] = await pool.query(
      `UPDATE \`${req.tableName}\` SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: `Data tidak ditemukan di ${req.tableName}.` });

    const updatedData = { id: parseInt(id), ...body };

    // 📡 Realtime Broadcast
    emitChange('data_updated', req.tableName, 'update', updatedData, actor);

    res.json({ message: `Data berhasil diperbarui di ${req.tableName}`, data: updatedData });
  } catch (err) {
    console.error(`[GENERIC] PUT ${req.tableName} error:`, err);
    res.status(500).json({ error: `Gagal memperbarui data di ${req.tableName}.` });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/data/:table/:id (Soft Delete)
───────────────────────────────────────────── */
router.delete('/:table/:id', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const { id } = req.params;
    const actor  = getActor(req);

    let result;
    if (NO_SOFT_DELETE.has(req.tableName)) {
      [result] = await pool.query(`DELETE FROM \`${req.tableName}\` WHERE id = ?`, [id]);
    } else {
      [result] = await pool.query(
        `UPDATE \`${req.tableName}\` SET is_deleted = 1, updated_by = ?, updated_at = NOW() WHERE id = ?`,
        [actor.username, id]
      );
    }

    if (result.affectedRows === 0) return res.status(404).json({ error: `Data tidak ditemukan di ${req.tableName}.` });

    // 📡 Realtime Broadcast
    emitChange('data_deleted', req.tableName, 'delete', { id: parseInt(id) }, actor);

    res.json({ message: `Data berhasil dihapus dari ${req.tableName}`, id: parseInt(id) });
  } catch (err) {
    console.error(`[GENERIC] DELETE ${req.tableName} error:`, err);
    res.status(500).json({ error: `Gagal menghapus data dari ${req.tableName}.` });
  }
});

module.exports = router;
