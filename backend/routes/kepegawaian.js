/**
 * ============================================================================
 * ROUTE: Data Kepegawaian Guru
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

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
      WHERE k.is_deleted = 0 AND g.is_deleted = 0
    `;
    const params = [];

    if (guru_id) {
      query += ' AND k.guru_id = ?';
      params.push(parseInt(guru_id));
    }

    query += ' ORDER BY k.tmt_pengangkatan DESC';
    const [rows] = await pool.query(query, params);
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
    const [rows] = await pool.query('SELECT * FROM kepegawaian WHERE id = ? AND is_deleted = 0 LIMIT 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data kepegawaian.' });
  }
});

// ============================================================================
// POST /api/kepegawaian — Tambah data kepegawaian
// ============================================================================
router.post('/', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const {
      guru_id, status_kepegawaian, jabatan, pangkat_golongan,
      tmt_pengangkatan, sk_pengangkatan, nomor_sk, tanggal_sk,
      pejabat_pengangkat, instansi, unit_kerja, gaji_pokok, tunjangan, keterangan
    } = req.body;

    if (!guru_id || !status_kepegawaian || !jabatan || !tmt_pengangkatan) {
      return res.status(400).json({ error: 'guru_id, status_kepegawaian, jabatan, dan tmt_pengangkatan wajib diisi.' });
    }

    const [result] = await pool.query(`
      INSERT INTO kepegawaian 
      (guru_id, status_kepegawaian, jabatan, pangkat_golongan, tmt_pengangkatan,
       sk_pengangkatan, nomor_sk, tanggal_sk, pejabat_pengangkat, instansi,
       unit_kerja, gaji_pokok, tunjangan, keterangan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      guru_id, status_kepegawaian, jabatan, pangkat_golongan || null, tmt_pengangkatan,
      sk_pengangkatan || null, nomor_sk || null, tanggal_sk || null,
      pejabat_pengangkat || null, instansi || 'Dinas Pendidikan',
      unit_kerja || 'SD Negeri Sumber Waru 2',
      gaji_pokok || null, tunjangan || null, keterangan || null
    ]);

    res.status(201).json({ message: 'Data kepegawaian berhasil ditambahkan.', insertId: result.insertId });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error inserting:', error);
    res.status(500).json({ error: 'Gagal menambahkan data kepegawaian.' });
  }
});

// ============================================================================
// PUT /api/kepegawaian/:id — Update data kepegawaian
// ============================================================================
router.put('/:id', requireRole('admin', 'operator'), async (req, res) => {
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

    const setClauses = Object.keys(updates).map(f => `${f} = ?`).join(', ');
    const [result] = await pool.query(
      `UPDATE kepegawaian SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      [...Object.values(updates), id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
    res.json({ message: 'Data kepegawaian berhasil diperbarui.' });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error updating:', error);
    res.status(500).json({ error: 'Gagal memperbarui data kepegawaian.' });
  }
});

// ============================================================================
// DELETE /api/kepegawaian/:id
// ============================================================================
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE kepegawaian SET is_deleted = 1 WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
    res.json({ message: 'Data kepegawaian berhasil dihapus.' });
  } catch (error) {
    console.error('[KEPEGAWAIAN] Error deleting:', error);
    res.status(500).json({ error: 'Gagal menghapus data kepegawaian.' });
  }
});

module.exports = router;
