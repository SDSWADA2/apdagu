/**
 * ============================================================================
 * ROUTE: Generic CRUD (Data Syncing)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');

// Mapping of frontend entity keys to MySQL database tables
const tableMapping = {
  // Master & Core
  guru: 'guru',
  kepegawaian: 'kepegawaian',
  pendidikan: 'pendidikan',
  riwayat_pendidikan: 'pendidikan',
  sertifikasi: 'sertifikasi',
  jadwal_mengajar: 'jadwal_mengajar',
  jadwal: 'jadwal_mengajar',
  beban_mengajar: 'beban_mengajar',
  beban: 'beban_mengajar',
  absensi: 'absensi',
  pkg: 'pkg',
  penilaian_kinerja_guru: 'pkg',
  prestasi: 'prestasi',
  prestasi_guru: 'prestasi',
  pelatihan: 'pelatihan',
  pelatihan_guru: 'pelatihan',
  dokumen: 'dokumen',
  dokumen_guru: 'dokumen',
  audit_logs: 'audit_logs',
  profil_sekolah: 'profil_sekolah',
  pengaturan_aplikasi: 'pengaturan_aplikasi',
  users: 'users'
};

// Whitelist of allowed MySQL tables
const whitelistedTables = [
  'guru',
  'kepegawaian',
  'pendidikan',
  'sertifikasi',
  'jadwal_mengajar',
  'beban_mengajar',
  'absensi',
  'pkg',
  'prestasi',
  'pelatihan',
  'dokumen',
  'audit_logs',
  'profil_sekolah',
  'pengaturan_aplikasi',
  'users'
];

// Table validation middleware
const validateTable = (req, res, next) => {
  const tableKey = req.params.table;
  const resolvedName = tableMapping[tableKey] || tableKey;
  if (!whitelistedTables.includes(resolvedName)) {
    return res.status(403).json({ error: `Akses ke tabel '${resolvedName}' tidak diizinkan.`, code: 'TABLE_FORBIDDEN' });
  }
  req.tableName = resolvedName;
  next();
};

// Semua endpoint generic membutuhkan autentikasi
router.use(verifyToken);
router.use('/:table', validateTable);

// ============================================================================
// GET /api/data/:table — Ambil semua baris data dari tabel
// ============================================================================
router.get('/:table', async (req, res) => {
  try {
    const { guru_id, limit = 500, offset = 0 } = req.query;
    let query = `SELECT * FROM \`${req.tableName}\` WHERE 1=1`;
    const params = [];

    const noDeletedCol = ['users', 'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi'];
    if (!noDeletedCol.includes(req.tableName)) {
      query += ' AND is_deleted = 0';
    }

    // Filter guru_id jika tabel memiliki kolom guru_id
    if (guru_id && !noDeletedCol.includes(req.tableName)) {
      query += ' AND guru_id = ?';
      params.push(parseInt(guru_id));
    }

    if (req.tableName === 'audit_logs') {
      query += ' ORDER BY created_at DESC';
    } else {
      query += ' ORDER BY id DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Jangan kirim password_hash jika request ke tabel users
    if (req.tableName === 'users') {
      const safeRows = rows.map(u => {
        const { password_hash, ...rest } = u;
        return rest;
      });
      return res.json({ data: safeRows, table: req.tableName, total: safeRows.length });
    }

    res.json({ data: rows, table: req.tableName, total: rows.length });
  } catch (error) {
    console.error(`[GENERIC] Error fetching ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal mengambil data ${req.tableName}.` });
  }
});

// ============================================================================
// GET /api/data/:table/:id — Ambil satu baris data berdasarkan ID
// ============================================================================
router.get('/:table/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const noDeletedCol = ['users', 'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi'];
    let query = `SELECT * FROM \`${req.tableName}\` WHERE id = ?`;
    if (!noDeletedCol.includes(req.tableName)) {
      query += ' AND is_deleted = 0';
    }
    query += ' LIMIT 1';
    
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Data ${req.tableName} tidak ditemukan.` });
    }

    const row = rows[0];
    if (req.tableName === 'users') {
      delete row.password_hash;
    }

    res.json({ data: row });
  } catch (error) {
    console.error(`[GENERIC] Error fetching detail ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal mengambil detail ${req.tableName}.` });
  }
});

// ============================================================================
// POST /api/data/:table — Tambah baris data baru
// ============================================================================
router.post('/:table', async (req, res) => {
  try {
    const data = req.body;

    // Filter fields yang aman
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid yang dapat disisipkan.' });
    }

    const queryFields = fields.map(f => `\`${f}\``).join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(f => data[f]);

    const query = `INSERT INTO \`${req.tableName}\` (${queryFields}) VALUES (${placeholders})`;
    const [result] = await pool.query(query, values);

    // 📡 Broadcast realtime
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    SocketServer.notifyInsert(req.tableName, { id: result.insertId, ...data }, actor);

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
// PUT /api/data/:table/:id — Update baris data
// ============================================================================
router.put('/:table/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data valid untuk diupdate.' });
    }

    const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ');
    const values = fields.map(f => data[f]);
    values.push(id);

    const query = `UPDATE \`${req.tableName}\` SET ${setClauses} WHERE id = ?`;
    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Data tidak ditemukan di ${req.tableName}.` });
    }

    // 📡 Broadcast realtime
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    SocketServer.notifyUpdate(req.tableName, { id: parseInt(id), ...data }, actor);

    res.json({ message: `Data berhasil diperbarui di ${req.tableName}`, data: { id: parseInt(id), ...data } });
  } catch (error) {
    console.error(`[GENERIC] Error updating ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal memperbarui data di ${req.tableName}.` });
  }
});

// ============================================================================
// DELETE /api/data/:table/:id — Hapus baris data
// ============================================================================
router.delete('/:table/:id', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(`DELETE FROM \`${req.tableName}\` WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Data tidak ditemukan di ${req.tableName}.` });
    }

    // 📡 Broadcast realtime
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    SocketServer.notifyDelete(req.tableName, id, actor);

    res.json({ message: `Data berhasil dihapus dari ${req.tableName}` });
  } catch (error) {
    console.error(`[GENERIC] Error deleting from ${req.tableName}:`, error);
    res.status(500).json({ error: `Gagal menghapus data dari ${req.tableName}.` });
  }
});

module.exports = router;
