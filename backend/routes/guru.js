/**
 * ============================================================================
 * ROUTE: Data Guru (Master Data) — Production Realtime Version (PostgreSQL)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const pool         = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');
const { sseEmitAll } = require('./events');

router.use(verifyToken);

const ALLOWED_UPDATE_FIELDS = [
  'nuptk', 'nip', 'nama_lengkap', 'gelar_depan', 'gelar_belakang',
  'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'status_pernikahan',
  'nik', 'no_kk', 'npwp', 'alamat_jalan', 'rt_rw', 'desa_kelurahan',
  'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos',
  'no_hp', 'email', 'foto_url', 'tanda_tangan_url', 'status_keaktifan',
];

function getActor(req) {
  return {
    username: req.user?.username || 'system',
    name    : req.user?.nama_lengkap || req.user?.username || 'System',
    role    : req.user?.role || 'unknown',
  };
}

async function writeAudit(client, actor, action, entity, recordId, before, after) {
  try {
    const dbClient = client || pool;
    await dbClient.query(
      `INSERT INTO audit_logs (user_id, username, aksi, tabel_terkait, deskripsi, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        null, // user_id (not provided in args for now)
        actor.username,
        action,
        entity,
        `Record ID: ${recordId}. Before: ${before ? JSON.stringify(before) : 'none'}. After: ${after ? JSON.stringify(after) : 'none'}`,
        null, // IP
        null  // user_agent
      ]
    );
  } catch (err) { console.error('[AUDIT ERROR]', err); }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ─────────────────────────────────────────────
   ROUTE: GET /api/guru
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;
    let query  = 'SELECT * FROM guru WHERE is_deleted = false';
    let countQuery = 'SELECT COUNT(*) AS total FROM guru WHERE is_deleted = false';
    const params = [];
    let idx = 1;

    if (status) {
      query += ` AND status_keaktifan = $${idx}`;
      countQuery += ` AND status_keaktifan = $${idx}`;
      params.push(status);
      idx++;
    }
    if (search) {
      query += ` AND (nama_lengkap ILIKE $${idx} OR nuptk ILIKE $${idx} OR nip ILIKE $${idx})`;
      countQuery += ` AND (nama_lengkap ILIKE $${idx} OR nuptk ILIKE $${idx} OR nip ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    
    query += ` ORDER BY nama_lengkap ASC LIMIT $${idx} OFFSET $${idx+1}`;
    
    const { rows } = await pool.query(query, [...params, parseInt(limit), parseInt(offset)]);
    const { rows: countRows } = await pool.query(countQuery, params);
    
    res.json({ data: rows, total: parseInt(countRows[0].total), limit: parseInt(limit), offset: parseInt(offset) });
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
    const { rows } = await pool.query('SELECT * FROM guru WHERE id = $1 AND is_deleted = false LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Data guru tidak ditemukan.' });

    const [kepegawaian, pendidikan, sertifikasi, jadwal, absensi] = await Promise.all([
      pool.query('SELECT * FROM kepegawaian WHERE guru_id = $1 AND is_deleted = false ORDER BY tmt_pengangkatan DESC', [id]),
      pool.query('SELECT * FROM pendidikan  WHERE guru_id = $1 AND is_deleted = false ORDER BY tahun_lulus DESC', [id]),
      pool.query('SELECT * FROM sertifikasi WHERE guru_id = $1 AND is_deleted = false ORDER BY tahun_sertifikasi DESC', [id]),
      pool.query('SELECT * FROM jadwal_mengajar WHERE guru_id = $1 AND is_deleted = false ORDER BY hari ASC', [id]),
      pool.query('SELECT * FROM absensi WHERE guru_id = $1 AND is_deleted = false ORDER BY tanggal DESC LIMIT 30', [id])
    ]);

    res.json({
      data      : rows[0],
      kepegawaian: kepegawaian.rows,
      pendidikan: pendidikan.rows,
      sertifikasi: sertifikasi.rows,
      jadwal_mengajar: jadwal.rows,
      absensi: absensi.rows,
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
  const client = await pool.connect();
  try {
    const actor  = getActor(req);
    const body   = req.body;

    const requiredFields = ['nama_lengkap', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'alamat_jalan', 'desa_kelurahan', 'kecamatan', 'kabupaten_kota', 'provinsi', 'no_hp'];
    const missing = requiredFields.filter(f => !body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Field wajib tidak lengkap: ${missing.join(', ')}` });
    }

    const fields = ALLOWED_UPDATE_FIELDS.filter(f => body[f] !== undefined);
    const cols   = fields.join(', ');
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const values = [...fields.map(f => body[f]), actor.username];
    
    // Add updated_by to fields and placeholders for PG compatibility
    const allCols = cols ? `${cols}, updated_by` : `updated_by`;
    const allPlaceholders = placeholders ? `${placeholders}, $${fields.length + 1}` : `$1`;

    await client.query('BEGIN');

    const { rows: result } = await client.query(
      `INSERT INTO guru (${allCols}) VALUES (${allPlaceholders}) RETURNING id`,
      values
    );
    
    const insertId = result[0].id;
    const { rows: newRow } = await client.query('SELECT * FROM guru WHERE id = $1 LIMIT 1', [insertId]);
    const data = { ...newRow[0], _action: 'insert' };

    await writeAudit(client, actor, 'insert', 'guru', insertId, null, data);

    await client.query('COMMIT');

    // Realtime: WebSocket + SSE
    try { SocketServer.notifyInsert('guru', data, actor); } catch {}
    try { sseEmitAll('data_inserted', { entity: 'guru', action: 'insert', data, by: actor, at: new Date().toISOString() }); } catch {}

    res.status(201).json({ message: 'Data guru berhasil ditambahkan.', data: newRow[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[GURU] POST error:', err);
    if (err.code === '23505') { // PostgreSQL unique violation code
      return res.status(409).json({ error: 'Data duplikat: NUPTK, NIP, atau NIK sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal menambahkan data guru.' });
  } finally {
    client.release();
  }
});

/* ─────────────────────────────────────────────
   ROUTE: PUT /api/guru/:id
───────────────────────────────────────────── */
router.put('/:id', requireRole(['admin', 'operator']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id }  = req.params;
    const actor   = getActor(req);
    const body    = req.body;

    const { rows: before } = await client.query('SELECT * FROM guru WHERE id = $1 AND is_deleted = false LIMIT 1', [id]);
    if (!before.length) {
      client.release();
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    const fields = ALLOWED_UPDATE_FIELDS.filter(f => body[f] !== undefined);
    if (!fields.length) {
      client.release();
      return res.status(400).json({ error: 'Tidak ada field yang diperbarui.' });
    }

    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = [...fields.map(f => body[f]), actor.username, id];

    await client.query('BEGIN');

    await client.query(`UPDATE guru SET ${set}, updated_by = $${fields.length + 1}, updated_at = NOW() WHERE id = $${fields.length + 2} AND is_deleted = false`, values);

    const { rows: after } = await client.query('SELECT * FROM guru WHERE id = $1 LIMIT 1', [id]);
    const data = { ...after[0], _action: 'update' };

    await writeAudit(client, actor, 'update', 'guru', id, before[0], data);
    
    await client.query('COMMIT');

    // Realtime: WebSocket + SSE
    try { SocketServer.notifyUpdate('guru', data, actor); } catch {}
    try { sseEmitAll('data_updated', { entity: 'guru', action: 'update', data, by: actor, at: new Date().toISOString() }); } catch {}

    res.json({ message: 'Data guru berhasil diperbarui.', data: after[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[GURU] PUT error:', err);
    if (err.code === '23505') { 
      return res.status(409).json({ error: 'Data duplikat: NUPTK, NIP, atau NIK sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal memperbarui data guru.' });
  } finally {
    client.release();
  }
});

/* ─────────────────────────────────────────────
   ROUTE: DELETE /api/guru/:id (Soft Delete)
───────────────────────────────────────────── */
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const actor  = getActor(req);

    const { rows } = await client.query('SELECT id, nama_lengkap FROM guru WHERE id = $1 AND is_deleted = false LIMIT 1', [id]);
    if (!rows.length) {
      client.release();
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    await client.query('BEGIN');

    // Hapus guru
    await client.query(
      'UPDATE guru SET is_deleted = true, updated_by = $1, updated_at = NOW() WHERE id = $2',
      [actor.username, id]
    );

    // Cascading soft delete untuk tabel anak
    const childTables = ['kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen'];
    for (const table of childTables) {
      await client.query(
        `UPDATE ${table} SET is_deleted = true, updated_by = $1, updated_at = NOW() WHERE guru_id = $2 AND is_deleted = false`,
        [actor.username, id]
      );
    }

    await writeAudit(client, actor, 'delete', 'guru', id, rows[0], { is_deleted: true });
    
    await client.query('COMMIT');

    // Realtime: WebSocket + SSE
    try { SocketServer.notifyDelete('guru', parseInt(id), actor); } catch {}
    try { sseEmitAll('data_deleted', { entity: 'guru', action: 'delete', data: { id: parseInt(id) }, by: actor, at: new Date().toISOString() }); } catch {}

    res.json({ message: `Data guru "${rows[0].nama_lengkap}" berhasil dihapus beserta data terkaitnya.`, id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[GURU] DELETE error:', err);
    res.status(500).json({ error: 'Gagal menghapus data guru.' });
  } finally {
    client.release();
  }
});

module.exports = router;
