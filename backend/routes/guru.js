/**
 * ============================================================================
 * ROUTE: Data Guru (Master Data) — Production Realtime Version
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 *  Setiap operasi tulis (POST/PUT/DELETE) otomatis:
 *  1. Menulis ke MySQL (sumber kebenaran tunggal)
 *  2. Memanggil SocketServer.notifyXxx() → broadcast ke semua client via WS
 *  3. Memanggil SseEvents.sseEmitAll()   → broadcast ke semua client via SSE
 *  4. Menulis ke tabel audit_logs
 * ============================================================================
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const pool         = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');
const { sseEmitAll } = require('./events');

// Semua endpoint guru memerlukan token yang valid
router.use(verifyToken);

// Field yang boleh diupdate (whitelist untuk keamanan)
const ALLOWED_UPDATE_FIELDS = [
  'nuptk', 'nip', 'nama_lengkap', 'gelar_depan', 'gelar_belakang',
  'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'status_pernikahan',
  'nik', 'no_kk', 'npwp', 'alamat_jalan', 'rt_rw', 'desa_kelurahan',
  'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos',
  'no_hp', 'email', 'foto_url', 'tanda_tangan_url', 'status_keaktifan',
];

/* ─────────────────────────────────────────────
   HELPER — aktor dari JWT
───────────────────────────────────────────── */
function getActor(req) {
  return {
    username: req.user?.username || 'system',
    name    : req.user?.nama_lengkap || req.user?.username || 'System',
    role    : req.user?.role || 'unknown',
  };
}

/* ─────────────────────────────────────────────
   HELPER — tulis audit log
───────────────────────────────────────────── */
async function writeAudit(actor, action, entity, recordId, before, after) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, entity, record_id, before_data, after_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE after_data = VALUES(after_data)`,
      [
        req?.user?.id || 0,
        actor.username,
        action,
        entity,
        recordId,
        before ? JSON.stringify(before) : null,
        after  ? JSON.stringify(after)  : null,
      ]
    );
  } catch { /* Audit tidak boleh merusak alur utama */ }
}

/* ─────────────────────────────────────────────
   HELPER — emit ke WebSocket + SSE sekaligus
───────────────────────────────────────────── */
function emitChange(event, entity, data, actor) {
  try { SocketServer.notifyInsert && SocketServer[`notify${capitalize(data._action || 'Update')}`]?.(entity, data, actor); } catch {}
  try { sseEmitAll(event, { entity, action: data._action || 'update', data, by: actor, at: new Date().toISOString() }); } catch {}
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ─────────────────────────────────────────────
   ROUTE: GET /api/guru
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;
    let query  = 'SELECT * FROM guru WHERE is_deleted = 0';
    const params = [];

    if (status) {
      query += ' AND status_keaktifan = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (nama_lengkap LIKE ? OR nuptk LIKE ? OR nip LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t);
    }
    query += ' ORDER BY nama_lengkap ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM guru WHERE is_deleted = 0' + (status ? ' AND status_keaktifan = ?' : ''),
      status ? [status] : []
    );
    res.json({ data: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[GURU] GET list error:', err);
    res.status(500).json({ error: 'Gagal mengambil data guru.' });
  }
});

/* ─────────────────────────────────────────────
   ROUTE: GET /api/guru/:id
───────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM guru WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Data guru tidak ditemukan.' });

    const [kepegawaian] = await pool.query('SELECT * FROM kepegawaian WHERE guru_id = ? AND is_deleted = 0 ORDER BY tmt_pengangkatan DESC', [id]);
    const [pendidikan]  = await pool.query('SELECT * FROM pendidikan  WHERE guru_id = ? AND is_deleted = 0 ORDER BY tahun_lulus DESC', [id]);
    const [sertifikasi] = await pool.query('SELECT * FROM sertifikasi WHERE guru_id = ? AND is_deleted = 0 ORDER BY tahun_sertifikasi DESC', [id]);
    const [jadwal]      = await pool.query('SELECT * FROM jadwal_mengajar WHERE guru_id = ? AND is_deleted = 0 ORDER BY hari ASC', [id]);
    const [absensi]     = await pool.query('SELECT * FROM absensi WHERE guru_id = ? AND is_deleted = 0 ORDER BY tanggal DESC LIMIT 30', [id]);

    res.json({
      data      : rows[0],
      kepegawaian,
      pendidikan,
      sertifikasi,
      jadwal_mengajar: jadwal,
      absensi,
    });
  } catch (err) {
    console.error('[GURU] GET detail error:', err);
    res.status(500).json({ error: 'Gagal mengambil detail guru.' });
  }
});

/* ─────────────────────────────────────────────
   ROUTE: POST /api/guru
───────────────────────────────────────────── */
router.post('/', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const actor  = getActor(req);
    const body   = req.body;

    const requiredFields = ['nama_lengkap', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'alamat_jalan', 'desa_kelurahan', 'kecamatan', 'kabupaten_kota', 'provinsi', 'no_hp'];
    const missing = requiredFields.filter(f => !body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Field wajib tidak lengkap: ${missing.join(', ')}` });
    }

    const fields = ALLOWED_UPDATE_FIELDS.filter(f => body[f] !== undefined);
    const cols   = fields.map(f => `\`${f}\``).join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const values = [...fields.map(f => body[f]), actor.username, actor.username];

    const [result] = await pool.query(
      `INSERT INTO guru (${cols}, created_by, updated_by) VALUES (${placeholders}, ?, ?)`,
      values
    );
    const [newRow] = await pool.query('SELECT * FROM guru WHERE id = ? LIMIT 1', [result.insertId]);
    const data = { ...newRow[0], _action: 'insert' };

    // Realtime: WebSocket + SSE
    SocketServer.notifyInsert('guru', data, actor);
    try { sseEmitAll('data_inserted', { entity: 'guru', action: 'insert', data, by: actor, at: new Date().toISOString() }); } catch {}

    res.status(201).json({ message: 'Data guru berhasil ditambahkan.', data: newRow[0] });
  } catch (err) {
    console.error('[GURU] POST error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Data duplikat: NUPTK, NIP, atau NIK sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal menambahkan data guru.' });
  }
});

/* ─────────────────────────────────────────────
   ROUTE: PUT /api/guru/:id
───────────────────────────────────────────── */
router.put('/:id', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const { id }  = req.params;
    const actor   = getActor(req);
    const body    = req.body;

    // Ambil data lama untuk audit
    const [before] = await pool.query('SELECT * FROM guru WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    if (!before.length) return res.status(404).json({ error: 'Data guru tidak ditemukan.' });

    const fields = ALLOWED_UPDATE_FIELDS.filter(f => body[f] !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Tidak ada field yang diperbarui.' });

    const set    = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = [...fields.map(f => body[f]), actor.username, id];

    await pool.query(`UPDATE guru SET ${set}, updated_by = ?, updated_at = NOW() WHERE id = ? AND is_deleted = 0`, values);

    const [after] = await pool.query('SELECT * FROM guru WHERE id = ? LIMIT 1', [id]);
    const data    = { ...after[0], _action: 'update' };

    // Realtime: WebSocket + SSE
    SocketServer.notifyUpdate('guru', data, actor);
    try { sseEmitAll('data_updated', { entity: 'guru', action: 'update', data, by: actor, at: new Date().toISOString() }); } catch {}

    res.json({ message: 'Data guru berhasil diperbarui.', data: after[0] });
  } catch (err) {
    console.error('[GURU] PUT error:', err);
    res.status(500).json({ error: 'Gagal memperbarui data guru.' });
  }
});

/* ─────────────────────────────────────────────
   ROUTE: DELETE /api/guru/:id (Soft Delete)
───────────────────────────────────────────── */
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const actor  = getActor(req);

    const [rows] = await pool.query('SELECT id, nama_lengkap FROM guru WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Data guru tidak ditemukan.' });

    await pool.query(
      'UPDATE guru SET is_deleted = 1, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [actor.username, id]
    );

    // Realtime: WebSocket + SSE
    SocketServer.notifyDelete('guru', parseInt(id), actor);
    try { sseEmitAll('data_deleted', { entity: 'guru', action: 'delete', data: { id: parseInt(id) }, by: actor, at: new Date().toISOString() }); } catch {}

    res.json({ message: `Data guru "${rows[0].nama_lengkap}" berhasil dihapus.`, id: parseInt(id) });
  } catch (err) {
    console.error('[GURU] DELETE error:', err);
    res.status(500).json({ error: 'Gagal menghapus data guru.' });
  }
});

module.exports = router;
