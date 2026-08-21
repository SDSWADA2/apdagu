/**
 * ============================================================================
 * ROUTE: Presensi / Absensi Guru Harian & Batch — PostgreSQL
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

'use strict';

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
    const params = [];
    let idx = 1;

    let query = `
      SELECT a.*, g.nama_lengkap AS nama_guru, g.nuptk, g.nip, g.foto_url
      FROM absensi a
      LEFT JOIN guru g ON g.id = a.guru_id
      WHERE a.is_deleted = false AND g.is_deleted = false
    `;

    if (tanggal) {
      query += ` AND a.tanggal = $${idx++}`;
      params.push(tanggal);
    }
    if (bulan && tahun) {
      query += ` AND EXTRACT(MONTH FROM a.tanggal) = $${idx++} AND EXTRACT(YEAR FROM a.tanggal) = $${idx++}`;
      params.push(parseInt(bulan), parseInt(tahun));
    } else if (tahun) {
      query += ` AND EXTRACT(YEAR FROM a.tanggal) = $${idx++}`;
      params.push(parseInt(tahun));
    }
    if (guru_id) {
      query += ` AND a.guru_id = $${idx++}`;
      params.push(parseInt(guru_id));
    }

    query += ' ORDER BY a.tanggal DESC, a.waktu_masuk ASC';

    const { rows } = await pool.query(query, params);
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
    const { rows } = await pool.query(`
      SELECT a.*, g.nama_lengkap AS nama_guru, g.nuptk, g.nip
      FROM absensi a
      LEFT JOIN guru g ON g.id = a.guru_id
      WHERE a.id = $1 AND a.is_deleted = false LIMIT 1
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

    // Upsert: cek apakah sudah ada data guru di tanggal yang sama
    const { rows: existing } = await pool.query(
      'SELECT id FROM absensi WHERE guru_id = $1 AND tanggal = $2 AND is_deleted = false LIMIT 1',
      [guru_id, tanggal]
    );

    if (existing.length > 0) {
      const existingId = existing[0].id;
      await pool.query(`
        UPDATE absensi SET
          waktu_masuk   = COALESCE($1, waktu_masuk),
          waktu_pulang  = COALESCE($2, waktu_pulang),
          status_kehadiran = $3,
          keterangan    = $4,
          lampiran_url  = $5,
          lokasi_gps    = $6,
          updated_at    = NOW()
        WHERE id = $7
      `, [waktu_masuk || null, waktu_pulang || null, status_kehadiran,
          keterangan, lampiran_url, lokasi_gps, existingId]);

      return res.json({
        message: 'Presensi berhasil diperbarui.',
        data: { id: existingId, ...req.body }
      });
    }

    const { rows: inserted } = await pool.query(`
      INSERT INTO absensi (
        guru_id, tanggal, waktu_masuk, waktu_pulang,
        status_kehadiran, keterangan, lampiran_url, lokasi_gps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      guru_id, tanggal, waktu_masuk || null, waktu_pulang || null,
      status_kehadiran, keterangan, lampiran_url, lokasi_gps
    ]);

    res.status(201).json({
      message: 'Presensi berhasil dicatat.',
      insertId: inserted[0].id,
      data: { id: inserted[0].id, ...req.body }
    });
  } catch (error) {
    console.error('[ABSENSI] Error saving absensi:', error);
    res.status(500).json({ error: 'Gagal mencatat presensi.' });
  }
});

// ============================================================================
// POST /api/absensi/batch — Catat / tandai semua guru hadir (Batch Attendance)
// ============================================================================
router.post('/batch', requireRole(['admin', 'operator']), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      tanggal,
      status_kehadiran = 'Hadir',
      waktu_masuk  = '06:45',
      waktu_pulang = '14:30',
      keterangan   = 'Tepat Waktu'
    } = req.body;

    if (!tanggal) {
      return res.status(400).json({ error: 'Tanggal presensi wajib diisi.' });
    }

    await client.query('BEGIN');

    // Ambil semua guru aktif
    const { rows: gurus } = await client.query(
      "SELECT id FROM guru WHERE status_keaktifan = 'Aktif' AND is_deleted = false"
    );
    let count = 0;

    for (const g of gurus) {
      const { rows: existing } = await client.query(
        'SELECT id FROM absensi WHERE guru_id = $1 AND tanggal = $2 AND is_deleted = false LIMIT 1',
        [g.id, tanggal]
      );

      if (existing.length > 0) {
        await client.query(
          `UPDATE absensi SET status_kehadiran = $1, waktu_masuk = $2, waktu_pulang = $3,
           keterangan = $4, updated_at = NOW() WHERE id = $5`,
          [status_kehadiran, waktu_masuk, waktu_pulang, keterangan, existing[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO absensi (guru_id, tanggal, waktu_masuk, waktu_pulang, status_kehadiran, keterangan)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [g.id, tanggal, waktu_masuk, waktu_pulang, status_kehadiran, keterangan]
        );
      }
      count++;
    }

    await client.query('COMMIT');
    res.json({ message: `Presensi batch berhasil disimpan untuk ${count} guru aktif.`, count, tanggal });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ABSENSI] Error batch absensi:', error);
    res.status(500).json({ error: 'Gagal memproses presensi batch.' });
  } finally {
    client.release();
  }
});

// ============================================================================
// PUT /api/absensi/:id — Update absensi
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const IGNORED = new Set(['id', 'created_at', 'nama_guru', 'nuptk', 'nip', 'foto_url']);
    const fields = Object.keys(data).filter(k => !IGNORED.has(k));

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid untuk diupdate.' });
    }

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
    const values = [...fields.map(f => data[f]), id];

    const { rowCount } = await pool.query(
      `UPDATE absensi SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`,
      values
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    res.json({ message: 'Presensi berhasil diperbarui.' });
  } catch (error) {
    console.error('[ABSENSI] Error updating:', error);
    res.status(500).json({ error: 'Gagal memperbarui presensi.' });
  }
});

// ============================================================================
// DELETE /api/absensi/:id — Hapus absensi (soft delete)
// ============================================================================
router.delete('/:id', requireRole(['admin', 'operator']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'UPDATE absensi SET is_deleted = true, updated_at = NOW() WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    res.json({ message: 'Data absensi berhasil dihapus.' });
  } catch (error) {
    console.error('[ABSENSI] Error deleting:', error);
    res.status(500).json({ error: 'Gagal menghapus absensi.' });
  }
});

module.exports = router;
