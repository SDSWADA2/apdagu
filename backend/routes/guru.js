/**
 * ============================================================================
 * ROUTE: Data Guru (Master Data)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

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

// ============================================================================
// GET /api/guru — Ambil semua data guru
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM guru WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status_keaktifan = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (nama_lengkap LIKE ? OR nuptk LIKE ? OR nip LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY nama_lengkap ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM guru WHERE 1=1' + (status ? ' AND status_keaktifan = ?' : ''),
      status ? [status] : []
    );

    res.json({ data: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('[GURU] Error fetching guru list:', error);
    res.status(500).json({ error: 'Gagal mengambil data guru.' });
  }
});

// ============================================================================
// GET /api/guru/:id — Ambil detail 1 guru beserta data terkait
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM guru WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    // Ambil data terkait sekaligus
    const [kepegawaian] = await pool.query('SELECT * FROM kepegawaian WHERE guru_id = ? ORDER BY tmt_pengangkatan DESC', [id]);
    const [pendidikan]  = await pool.query('SELECT * FROM riwayat_pendidikan WHERE guru_id = ? ORDER BY tahun_lulus DESC', [id]);
    const [sertifikasi] = await pool.query('SELECT * FROM sertifikasi WHERE guru_id = ? ORDER BY tahun_sertifikasi DESC', [id]);

    res.json({
      data: rows[0],
      kepegawaian,
      pendidikan,
      sertifikasi,
    });
  } catch (error) {
    console.error('[GURU] Error fetching guru detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail data guru.' });
  }
});

// ============================================================================
// POST /api/guru — Tambah guru baru (admin & operator only)
// ============================================================================
router.post('/', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const {
      nuptk, nip, nama_lengkap, gelar_depan, gelar_belakang,
      jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status_pernikahan,
      nik, no_kk, npwp, alamat_jalan, rt_rw, desa_kelurahan,
      kecamatan, kabupaten_kota, provinsi, kode_pos,
      no_hp, email, foto_url, tanda_tangan_url, status_keaktifan,
    } = req.body;

    // Validasi field wajib
    if (!nama_lengkap || !jenis_kelamin || !tempat_lahir || !tanggal_lahir || !agama || !no_hp) {
      return res.status(400).json({ error: 'Field wajib belum terisi: nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, no_hp.' });
    }

    // Cek duplikasi NUPTK dan NIP
    if (nuptk) {
      const [dup] = await pool.query('SELECT id FROM guru WHERE nuptk = ? LIMIT 1', [nuptk]);
      if (dup.length > 0) return res.status(409).json({ error: `NUPTK "${nuptk}" sudah terdaftar.` });
    }
    if (nip) {
      const [dup] = await pool.query('SELECT id FROM guru WHERE nip = ? LIMIT 1', [nip]);
      if (dup.length > 0) return res.status(409).json({ error: `NIP "${nip}" sudah terdaftar.` });
    }

    const query = `
      INSERT INTO guru 
      (nuptk, nip, nama_lengkap, gelar_depan, gelar_belakang, jenis_kelamin, tempat_lahir, 
       tanggal_lahir, agama, status_pernikahan, nik, no_kk, npwp, alamat_jalan, rt_rw,
       desa_kelurahan, kecamatan, kabupaten_kota, provinsi, kode_pos,
       no_hp, email, foto_url, tanda_tangan_url, status_keaktifan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      nuptk || null, nip || null, nama_lengkap,
      gelar_depan || null, gelar_belakang || null,
      jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
      status_pernikahan || 'Menikah',
      nik || null, no_kk || null, npwp || null,
      alamat_jalan || null, rt_rw || null,
      desa_kelurahan || null, kecamatan || null, kabupaten_kota || null,
      provinsi || null, kode_pos || null,
      no_hp, email || null, foto_url || null, tanda_tangan_url || null,
      status_keaktifan || 'Aktif',
    ];

    const [result] = await pool.query(query, values);

    res.status(201).json({
      message: `Guru "${nama_lengkap}" berhasil ditambahkan.`,
      insertId: result.insertId,
    });
  } catch (error) {
    console.error('[GURU] Error inserting guru:', error);
    res.status(500).json({ error: 'Gagal menambahkan data guru.' });
  }
});

// ============================================================================
// PUT /api/guru/:id — Update data guru (semua field yang dikirim)
// ============================================================================
router.put('/:id', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verifikasi guru ada
    const [existing] = await pool.query('SELECT id FROM guru WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    // Filter hanya field yang ada di whitelist dan dikirim di body
    const updates = {};
    ALLOWED_UPDATE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === '' ? null : req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Tidak ada field yang valid untuk diupdate.' });
    }

    // Cek duplikasi NUPTK/NIP jika diubah
    if (updates.nuptk) {
      const [dup] = await pool.query('SELECT id FROM guru WHERE nuptk = ? AND id != ? LIMIT 1', [updates.nuptk, id]);
      if (dup.length > 0) return res.status(409).json({ error: `NUPTK "${updates.nuptk}" sudah digunakan guru lain.` });
    }
    if (updates.nip) {
      const [dup] = await pool.query('SELECT id FROM guru WHERE nip = ? AND id != ? LIMIT 1', [updates.nip, id]);
      if (dup.length > 0) return res.status(409).json({ error: `NIP "${updates.nip}" sudah digunakan guru lain.` });
    }

    // Bangun query SET secara dinamis
    const setClauses = Object.keys(updates).map(f => `${f} = ?`).join(', ');
    const setValues = Object.values(updates);

    await pool.query(
      `UPDATE guru SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      [...setValues, id]
    );

    res.json({ message: 'Data guru berhasil diperbarui.', updatedFields: Object.keys(updates) });
  } catch (error) {
    console.error('[GURU] Error updating guru:', error);
    res.status(500).json({ error: 'Gagal memperbarui data guru.' });
  }
});

// ============================================================================
// PATCH /api/guru/:id/status — Update hanya status keaktifan
// ============================================================================
router.patch('/:id/status', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status_keaktifan } = req.body;

    const validStatuses = ['Aktif', 'Cuti', 'Mutasi', 'Pensiun', 'Keluar'];
    if (!status_keaktifan || !validStatuses.includes(status_keaktifan)) {
      return res.status(400).json({
        error: `Status tidak valid. Pilihan: ${validStatuses.join(', ')}.`
      });
    }

    const [result] = await pool.query(
      'UPDATE guru SET status_keaktifan = ?, updated_at = NOW() WHERE id = ?',
      [status_keaktifan, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    res.json({ message: `Status guru berhasil diubah menjadi "${status_keaktifan}".` });
  } catch (error) {
    console.error('[GURU] Error updating status:', error);
    res.status(500).json({ error: 'Gagal mengubah status guru.' });
  }
});

// ============================================================================
// DELETE /api/guru/:id — Hapus guru (admin only, cascade)
// ============================================================================
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT nama_lengkap FROM guru WHERE id = ? LIMIT 1', [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
    }

    const namaGuru = existing[0].nama_lengkap;

    // Hapus data terkait dulu (sesuai referential integrity jika tidak ada CASCADE)
    const relatedTables = [
      'kepegawaian', 'riwayat_pendidikan', 'sertifikasi',
      'jadwal_mengajar', 'beban_mengajar', 'absensi',
      'penilaian_kinerja_guru', 'prestasi_guru', 'pelatihan_guru', 'dokumen_guru'
    ];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const table of relatedTables) {
        try {
          await connection.query(`DELETE FROM ${table} WHERE guru_id = ?`, [id]);
        } catch (e) {
          // Tabel mungkin tidak ada — abaikan
        }
      }

      await connection.query('DELETE FROM guru WHERE id = ?', [id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.json({ message: `Data guru "${namaGuru}" beserta semua data terkait berhasil dihapus.` });
  } catch (error) {
    console.error('[GURU] Error deleting guru:', error);
    res.status(500).json({ error: 'Gagal menghapus data guru.' });
  }
});

module.exports = router;
