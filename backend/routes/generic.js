/**
 * ============================================================================
 * ROUTE: Generic CRUD (Data Syncing)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// Mapping of frontend IndexedDB keys to MySQL tables (optional)
// If a key is not listed here, the raw table name will be used directly.
const tableMapping = {
  pendidikan: 'riwayat_pendidikan',
  sertifikasi: 'sertifikasi',
  jadwal_mengajar: 'jadwal_mengajar',
  beban_mengajar: 'beban_mengajar',
  absensi: 'absensi',
  pkg: 'penilaian_kinerja_guru',
  prestasi: 'prestasi_guru',
  pelatihan: 'pelatihan_guru',
  dokumen: 'dokumen_guru',
  audit_logs: 'audit_logs', // optional
};

// Whitelist of tables allowed for generic CRUD operations
const whitelistedTables = [
  'guru',
  'kepegawaian',
  'riwayat_pendidikan',
  'sertifikasi',
  'jadwal_mengajar',
  'beban_mengajar',
  'absensi',
  'penilaian_kinerja_guru',
  'prestasi_guru',
  'pelatihan_guru',
  'dokumen_guru',
  'audit_logs',
];

// Middleware that validates the requested table.
// Allows any table name; if the table is defined in `tableMapping`, the mapped MySQL
// name is used, otherwise the raw key is assumed to be the actual table name.
const validateTable = (req, res, next) => {
  const tableKey = req.params.table;
  const resolvedName = tableMapping[tableKey] || tableKey; // fallback to raw name
  if (!whitelistedTables.includes(resolvedName)) {
    return res.status(403).json({ error: `Akses ke tabel '${resolvedName}' tidak diizinkan.` });
  }
  req.tableName = resolvedName;
  next();
};

// Semua endpoint generic membutuhkan autentikasi
router.use(verifyToken);
router.use('/:table', validateTable);

// Rate limiter for generic routes (60 req / 5 min per IP)
const rateLimit = require('express-rate-limit');
const genericLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { error: 'Terlalu banyak request ke endpoint generic. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(genericLimiter);

// ============================================================================
// GET /api/data/:table — Ambil semua data di tabel tersebut
// ============================================================================
router.get('/:table', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${req.tableName}`);
    res.json({ data: rows });
  } catch (error) {
    console.error(`[GENERIC] Error fetching ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal mengambil data ${req.tableName}.` });
  }
});

// ============================================================================
// POST /api/data/:table — Tambah baris data baru
// ============================================================================
router.post('/:table', async (req, res) => {
  try {
    const data = req.body;

    // Jangan izinkan ID disisipkan jika itu auto_increment, tapi jika ID dikirim untuk sinkronisasi offline (IndexedDB id)
    // MySQL auto_increment lebih baik mengatur ID-nya, tapi ini bisa bentrok jika offline ID berbeda dengan online ID.
    // Untuk menyederhanakan (karena DB.insert state lokal memberikan ID lokal), kita akan biarkan DB memberikan InsertId, 
    // lalu frontend akan mereplace ID aslinya via response.

    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const values = fields.map(f => data[f]);
    const placeholders = fields.map(() => '?').join(', ');

    // Basic validation: ensure at least one field is provided
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang dapat disisipkan.' });
    }

    const queryFields = fields.join(', ');
    let query = `INSERT INTO ${req.tableName} (${queryFields}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);

    res.status(201).json({
      message: `Data berhasil ditambahkan ke ${req.tableName}`,
      insertId: result.insertId,
      data: { id: result.insertId, ...data }
    });
  } catch (error) {
    console.error(`[GENERIC] Error inserting to ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal menambah data ke ${req.tableName}.` });
  }
});

// ============================================================================
// PUT /api/data/:table/:id — Update data 
// ============================================================================
router.put('/:table/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid untuk diupdate.' });
    }

    const setClauses = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);

    const query = `UPDATE ${req.tableName} SET ${setClauses} WHERE id = ?`;
    values.push(id);

    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      // Data mungkin baru di lokal dan belum ada di server (Edge case sync offline to online)
      return res.status(404).json({ error: 'Data tidak ditemukan di server.' });
    }

    res.json({ message: `Data berhasil diperbarui di ${req.tableName}` });
  } catch (error) {
    console.error(`[GENERIC] Error updating ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal memperbarui data di ${req.tableName}.` });
  }
});

// ============================================================================
// DELETE /api/data/:table/:id — Hapus data
// ============================================================================
router.delete('/:table/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`DELETE FROM ${req.tableName} WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan di server.' });
    }

    res.json({ message: `Data berhasil dihapus dari ${req.tableName}` });
  } catch (error) {
    console.error(`[GENERIC] Error deleting from ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal menghapus data dari ${req.tableName}.` });
  }
});

module.exports = router;
