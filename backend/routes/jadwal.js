/**
 * ============================================================================
 * ROUTE: Jadwal Mengajar Guru (Kurikulum Merdeka) - PostgreSQL
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// ============================================================================
// GET /api/jadwal — Ambil jadwal mengajar (dengan filter guru_id, kelas, hari)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { guru_id, kelas, hari, semester, tahun_ajaran } = req.query;
    let query = `
      SELECT j.*, g.nama_lengkap AS nama_guru, g.nuptk, g.nip
      FROM jadwal_mengajar j
      LEFT JOIN guru g ON g.id = j.guru_id
      WHERE j.is_deleted = 0 AND g.is_deleted = 0
    `;
    const params = [];
    let idx = 1;

    if (guru_id) {
      query += ` AND j.guru_id = $${idx++}`;
      params.push(parseInt(guru_id));
    }
    if (kelas) {
      query += ` AND j.kelas = $${idx++}`;
      params.push(kelas);
    }
    if (hari) {
      query += ` AND j.hari = $${idx++}`;
      params.push(hari);
    }
    if (semester) {
      query += ` AND j.semester = $${idx++}`;
      params.push(semester);
    }
    if (tahun_ajaran) {
      query += ` AND j.tahun_ajaran = $${idx++}`;
      params.push(tahun_ajaran);
    }

    // PostgreSQL specific sorting instead of FIELD()
    query += `
      ORDER BY 
        CASE j.hari 
          WHEN 'Senin' THEN 1 
          WHEN 'Selasa' THEN 2 
          WHEN 'Rabu' THEN 3 
          WHEN 'Kamis' THEN 4 
          WHEN 'Jumat' THEN 5 
          WHEN 'Sabtu' THEN 6 
          ELSE 7 
        END, 
        j.waktu_mulai ASC
    `;

    const { rows } = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error('[JADWAL] Error fetching jadwal:', error);
    res.status(500).json({ error: 'Gagal mengambil data jadwal mengajar.' });
  }
});

// ============================================================================
// GET /api/jadwal/:id — Ambil detail 1 jadwal
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, g.nama_lengkap AS nama_guru, g.nuptk, g.nip
      FROM jadwal_mengajar j
      LEFT JOIN guru g ON g.id = j.guru_id
      WHERE j.id = $1 AND j.is_deleted = 0 LIMIT 1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Data jadwal tidak ditemukan.' });
    }

    res.json({ data: rows[0] });
  } catch (error) {
    console.error('[JADWAL] Error fetching detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail jadwal mengajar.' });
  }
});

// ============================================================================
// POST /api/jadwal — Tambah jadwal baru
// ============================================================================
router.post('/', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const {
      guru_id, tahun_ajaran = '2026/2027', semester = 'Ganjil',
      hari, jam_ke, waktu_mulai, waktu_selesai,
      kelas, mata_pelajaran, ruangan = 'Ruang Kelas', jumlah_jp = 2
    } = req.body;

    if (!guru_id || !hari || !jam_ke || !kelas || !mata_pelajaran) {
      return res.status(400).json({ error: 'Field wajib (guru_id, hari, jam_ke, kelas, mata_pelajaran) belum lengkap.' });
    }

    const query = `
      INSERT INTO jadwal_mengajar (
        guru_id, tahun_ajaran, semester, hari, jam_ke,
        waktu_mulai, waktu_selesai, kelas, mata_pelajaran,
        ruangan, jumlah_jp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const { rows } = await pool.query(query, [
      guru_id, tahun_ajaran, semester, hari, jam_ke,
      waktu_mulai || '07:00', waktu_selesai || '08:20',
      kelas, mata_pelajaran, ruangan, parseInt(jumlah_jp) || 2
    ]);

    res.status(201).json({
      message: 'Jadwal mengajar berhasil ditambahkan.',
      insertId: rows[0].id,
      data: { id: rows[0].id, ...req.body }
    });
  } catch (error) {
    console.error('[JADWAL] Error inserting:', error);
    res.status(500).json({ error: 'Gagal menambahkan jadwal mengajar.' });
  }
});

// ============================================================================
// PUT /api/jadwal/:id — Update jadwal
// ============================================================================
router.put('/:id', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'nama_guru' && k !== 'nuptk' && k !== 'nip');
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid untuk diupdate.' });
    }

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
    const values = fields.map(f => data[f]);
    values.push(id);

    const { rowCount } = await pool.query(`UPDATE jadwal_mengajar SET ${setClauses} WHERE id = $${values.length}`, values);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Data jadwal tidak ditemukan.' });
    }

    res.json({ message: 'Jadwal mengajar berhasil diperbarui.' });
  } catch (error) {
    console.error('[JADWAL] Error updating:', error);
    res.status(500).json({ error: 'Gagal memperbarui jadwal mengajar.' });
  }
});

// ============================================================================
// DELETE /api/jadwal/:id — Hapus jadwal
// ============================================================================
router.delete('/:id', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('UPDATE jadwal_mengajar SET is_deleted = 1 WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Data jadwal tidak ditemukan.' });
    }

    res.json({ message: 'Jadwal mengajar berhasil dihapus.' });
  } catch (error) {
    console.error('[JADWAL] Error deleting:', error);
    res.status(500).json({ error: 'Gagal menghapus jadwal mengajar.' });
  }
});

module.exports = router;
