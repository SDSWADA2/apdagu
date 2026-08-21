/**
 * ============================================================================
 * ROUTE: Presensi / Absensi Guru Harian & Batch
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// ============================================================================
// GET /api/absensi — Ambil daftar absensi (filter: tanggal, bulan, guru_id)
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const { tanggal, bulan, tahun, guru_id } = req.query;
    let query = `
      SELECT a.*, g.nama_lengkap AS nama_guru, g.nuptk, g.nip, g.foto_url
      FROM absensi a
      LEFT JOIN guru g ON g.id = a.guru_id
      WHERE 1=1
    `;
    const params = [];

    if (tanggal) {
      query += ' AND a.tanggal = ?';
      params.push(tanggal);
    }
    if (bulan && tahun) {
      query += ' AND MONTH(a.tanggal) = ? AND YEAR(a.tanggal) = ?';
      params.push(parseInt(bulan), parseInt(tahun));
    } else if (tahun) {
      query += ' AND YEAR(a.tanggal) = ?';
      params.push(parseInt(tahun));
    }
    if (guru_id) {
      query += ' AND a.guru_id = ?';
      params.push(parseInt(guru_id));
    }

    query += ' ORDER BY a.tanggal DESC, a.waktu_masuk ASC';

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error('[ABSENSI] Error fetching absensi:', error);
    res.status(500).json({ error: 'Gagal mengambil data absensi.' });
  }
});

// ============================================================================
// GET /api/absensi/:id — Detail 1 absensi
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, g.nama_lengkap AS nama_guru, g.nuptk, g.nip
      FROM absensi a
      LEFT JOIN guru g ON g.id = a.guru_id
      WHERE a.id = ? LIMIT 1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    res.json({ data: rows[0] });
  } catch (error) {
    console.error('[ABSENSI] Error fetching detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail absensi.' });
  }
});

// ============================================================================
// POST /api/absensi — Catat absensi satuan (atau upsert jika sudah ada di tanggal tsb)
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const {
      guru_id, tanggal, waktu_masuk, waktu_pulang,
      status_kehadiran = 'Hadir', keterangan = '',
      lampiran_url = '', lokasi_gps = ''
    } = req.body;

    if (!guru_id || !tanggal || !status_kehadiran) {
      return res.status(400).json({ error: 'Field guru_id, tanggal, dan status_kehadiran wajib diisi.' });
    }

    // Upsert (jika sudah ada data guru di tanggal yang sama)
    const [existing] = await pool.query(
      'SELECT id FROM absensi WHERE guru_id = ? AND tanggal = ? LIMIT 1',
      [guru_id, tanggal]
    );

    if (existing.length > 0) {
      const existingId = existing[0].id;
      await pool.query(`
        UPDATE absensi SET
          waktu_masuk = COALESCE(?, waktu_masuk),
          waktu_pulang = COALESCE(?, waktu_pulang),
          status_kehadiran = ?,
          keterangan = ?,
          lampiran_url = ?,
          lokasi_gps = ?
        WHERE id = ?
      `, [waktu_masuk, waktu_pulang, status_kehadiran, keterangan, lampiran_url, lokasi_gps, existingId]);

      return res.json({
        message: 'Presensi berhasil diperbarui.',
        data: { id: existingId, ...req.body }
      });
    }

    const query = `
      INSERT INTO absensi (
        guru_id, tanggal, waktu_masuk, waktu_pulang,
        status_kehadiran, keterangan, lampiran_url, lokasi_gps
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      guru_id, tanggal, waktu_masuk || null, waktu_pulang || null,
      status_kehadiran, keterangan, lampiran_url, lokasi_gps
    ]);

    res.status(201).json({
      message: 'Presensi berhasil dicatat.',
      insertId: result.insertId,
      data: { id: result.insertId, ...req.body }
    });
  } catch (error) {
    console.error('[ABSENSI] Error saving absensi:', error);
    res.status(500).json({ error: 'Gagal mencatat presensi.' });
  }
});

// ============================================================================
// POST /api/absensi/batch — Catat / tandai semua guru hadir (Batch Attendance)
// ============================================================================
router.post('/batch', requireRole('admin', 'operator'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { tanggal, status_kehadiran = 'Hadir', waktu_masuk = '06:45', waktu_pulang = '14:30', keterangan = 'Tepat Waktu' } = req.body;

    if (!tanggal) {
      return res.status(400).json({ error: 'Tanggal presensi wajib diisi.' });
    }

    await conn.beginTransaction();

    // Ambil semua guru aktif
    const [gurus] = await conn.query("SELECT id FROM guru WHERE status_keaktifan = 'Aktif'");
    let count = 0;

    for (const g of gurus) {
      const [existing] = await conn.query(
        'SELECT id FROM absensi WHERE guru_id = ? AND tanggal = ? LIMIT 1',
        [g.id, tanggal]
      );

      if (existing.length > 0) {
        await conn.query(
          'UPDATE absensi SET status_kehadiran = ?, waktu_masuk = ?, waktu_pulang = ?, keterangan = ? WHERE id = ?',
          [status_kehadiran, waktu_masuk, waktu_pulang, keterangan, existing[0].id]
        );
      } else {
        await conn.query(
          'INSERT INTO absensi (guru_id, tanggal, waktu_masuk, waktu_pulang, status_kehadiran, keterangan) VALUES (?, ?, ?, ?, ?, ?)',
          [g.id, tanggal, waktu_masuk, waktu_pulang, status_kehadiran, keterangan]
        );
      }
      count++;
    }

    await conn.commit();
    res.json({ message: `Presensi batch berhasil disimpan untuk ${count} guru aktif.`, count, tanggal });
  } catch (error) {
    await conn.rollback();
    console.error('[ABSENSI] Error batch absensi:', error);
    res.status(500).json({ error: 'Gagal memproses presensi batch.' });
  } finally {
    conn.release();
  }
});

// ============================================================================
// PUT /api/absensi/:id — Update absensi
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'nama_guru' && k !== 'nuptk' && k !== 'nip' && k !== 'foto_url');
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid untuk diupdate.' });
    }

    const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = fields.map(f => data[f]);
    values.push(id);

    const [result] = await pool.query(`UPDATE absensi SET ${setClauses} WHERE id = ?`, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    res.json({ message: 'Presensi berhasil diperbarui.' });
  } catch (error) {
    console.error('[ABSENSI] Error updating:', error);
    res.status(500).json({ error: 'Gagal memperbarui presensi.' });
  }
});

// ============================================================================
// DELETE /api/absensi/:id — Hapus absensi
// ============================================================================
router.delete('/:id', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM absensi WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    res.json({ message: 'Data absensi berhasil dihapus.' });
  } catch (error) {
    console.error('[ABSENSI] Error deleting:', error);
    res.status(500).json({ error: 'Gagal menghapus absensi.' });
  }
});

module.exports = router;
