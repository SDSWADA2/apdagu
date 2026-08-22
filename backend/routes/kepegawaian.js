/**
 * ============================================================================
 * ROUTE: Data Kepegawaian Guru (PostgreSQL Version)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');
const { sseEmitAll } = require('./events');

router.use(verifyToken);

// ============================================================================
// GET /api/kepegawaian — Ambil semua data kepegawaian
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { guru_id } = req.query;
    let query = `
      SELECT k.*, g.nama_lengkap, g.gelar_depan, g.gelar_belakang, g.nuptk, g.nip
      FROM kepegawaian k
      LEFT JOIN guru g ON g.id = k.guru_id
      WHERE k.is_deleted = false AND g.is_deleted = false
    `;
    const params = [];

    if (guru_id) {
      query += ' AND k.guru_id = $1';
      params.push(parseInt(guru_id));
    }

    query += ' ORDER BY k.tmt_pengangkatan DESC';
    const { rows } = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error fetching:', error);
    res.status(500).json({ error: 'Gagal mengambil data kepegawaian.' });
  }
});

// ============================================================================
// GET /api/kepegawaian/:id
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM kepegawaian WHERE id = $1 AND is_deleted = false LIMIT 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data kepegawaian.' });
  }
});

// ============================================================================
// POST /api/kepegawaian — Tambah data kepegawaian
// ============================================================================
router.post('/', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const {
      guru_id, status_kepegawaian, jabatan, pangkat_golongan,
      tmt_pengangkatan, sk_pengangkatan, nomor_sk, tanggal_sk,
      pejabat_pengangkat, instansi, unit_kerja, gaji_pokok, tunjangan, keterangan
    } = req.body;

    if (!guru_id || !status_kepegawaian || !jabatan || !tmt_pengangkatan) {
      return res.status(400).json({ error: 'guru_id, status_kepegawaian, jabatan, dan tmt_pengangkatan wajib diisi.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO kepegawaian 
      (guru_id, status_kepegawaian, jabatan, pangkat_golongan, tmt_pengangkatan,
       sk_pengangkatan, nomor_sk, tanggal_sk, pejabat_pengangkat, instansi,
       unit_kerja, gaji_pokok, tunjangan, keterangan, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING id
    `, [
      guru_id, status_kepegawaian, jabatan, pangkat_golongan || null, tmt_pengangkatan,
      sk_pengangkatan || null, nomor_sk || null, tanggal_sk || null,
      pejabat_pengangkat || null, instansi || 'Dinas Pendidikan',
      unit_kerja || 'SD Negeri Sumber Waru 2',
      gaji_pokok || null, tunjangan || null, keterangan || null
    ]);

    const insertId = rows[0].id;
    const actor = { username: req.user?.username || 'system', name: req.user?.nama_lengkap || req.user?.username || 'System' };
    const newData = { id: insertId, guru_id, status_kepegawaian, jabatan, pangkat_golongan, tmt_pengangkatan, _action: 'insert' };
    
    try { SocketServer.notifyInsert('kepegawaian', newData, actor); } catch {}
    try { sseEmitAll('data_inserted', { entity: 'kepegawaian', action: 'insert', data: newData, by: actor, at: new Date().toISOString() }); } catch {}

    res.status(201).json({ message: 'Data kepegawaian berhasil ditambahkan.', insertId });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error inserting:', error);
    res.status(500).json({ error: 'Gagal menambahkan data kepegawaian.' });
  }
});

// ============================================================================
// PUT /api/kepegawaian/:id — Update data kepegawaian
// ============================================================================
router.put('/:id', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'status_kepegawaian', 'jabatan', 'pangkat_golongan', 'tmt_pengangkatan',
      'sk_pengangkatan', 'nomor_sk', 'tanggal_sk', 'pejabat_pengangkat',
      'instansi', 'unit_kerja', 'gaji_pokok', 'tunjangan', 'keterangan'
    ];

    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] || null; });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Tidak ada field valid untuk diupdate.' });
    }

    const setClauses = Object.keys(updates).map((f, index) => `${f} = $${index + 1}`).join(', ');
    const values = [...Object.values(updates), id];

    const { rowCount } = await pool.query(
      `UPDATE kepegawaian SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`,
      values
    );

    if (rowCount === 0) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
    
    const actor = { username: req.user?.username || 'system', name: req.user?.nama_lengkap || req.user?.username || 'System' };
    const newData = { ...updates, id, _action: 'update' };
    try { SocketServer.notifyUpdate('kepegawaian', newData, actor); } catch {}
    try { sseEmitAll('data_updated', { entity: 'kepegawaian', action: 'update', data: newData, by: actor, at: new Date().toISOString() }); } catch {}

    res.json({ message: 'Data kepegawaian berhasil diperbarui.' });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error updating:', error);
    res.status(500).json({ error: 'Gagal memperbarui data kepegawaian.' });
  }
});

// ============================================================================
// DELETE /api/kepegawaian/:id
// ============================================================================
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE kepegawaian SET is_deleted = true, updated_at = NOW() WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
    
    const actor = { username: req.user?.username || 'system', name: req.user?.nama_lengkap || req.user?.username || 'System' };
    try { SocketServer.notifyDelete('kepegawaian', parseInt(req.params.id), actor); } catch {}
    try { sseEmitAll('data_deleted', { entity: 'kepegawaian', action: 'delete', data: { id: parseInt(req.params.id) }, by: actor, at: new Date().toISOString() }); } catch {}

    res.json({ message: 'Data kepegawaian berhasil dihapus.' });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error deleting:', error);
    res.status(500).json({ error: 'Gagal menghapus data kepegawaian.' });
  }
});

module.exports = router;
