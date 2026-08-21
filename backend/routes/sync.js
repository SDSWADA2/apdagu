/**
 * ============================================================================
 * ROUTE: State Synchronization & Offline Queue Handler
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');

// Whitelist of valid table names for synchronization
const ALLOWED_TABLES = new Set([
  'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
  'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan',
  'dokumen', 'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi'
]);

// Frontend alias to database table mapping
const TABLE_MAPPING = {
  guru: 'guru',
  kepegawaian: 'kepegawaian',
  pendidikan: 'pendidikan',
  riwayat_pendidikan: 'pendidikan',
  sertifikasi: 'sertifikasi',
  jadwal: 'jadwal_mengajar',
  jadwal_mengajar: 'jadwal_mengajar',
  beban: 'beban_mengajar',
  beban_mengajar: 'beban_mengajar',
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
  pengaturan: 'pengaturan_aplikasi'
};

const IGNORED_FIELDS = new Set(['id', 'created_at', 'updated_at', 'nama_guru', 'nuptk', 'nip', 'foto_guru', 'nama_lengkap']);

// Helper: build parameterized insert query
function buildInsert(table, data) {
  const keys = Object.keys(data).filter(k => {
    if (IGNORED_FIELDS.has(k)) return false;
    const val = data[k];
    return typeof val !== 'object' || val === null;
  });
  const cols = keys.map(k => `\`${k}\``).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => data[k]);
  const sql = `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`;
  return { sql, values };
}

// Helper: build parameterized update query
function buildUpdate(table, data) {
  const id = data.id;
  if (!id) throw new Error(`Missing ID for updating table ${table}`);
  const keys = Object.keys(data).filter(k => {
    if (IGNORED_FIELDS.has(k)) return false;
    const val = data[k];
    return typeof val !== 'object' || val === null;
  });
  const set = keys.map(k => `\`${k}\` = ?`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `UPDATE \`${table}\` SET ${set} WHERE id = ?`;
  values.push(id);
  return { sql, values };
}

// Semua endpoint sync membutuhkan autentikasi
router.use(verifyToken);

// ============================================================================
// GET /api/sync/status — Status sinkronisasi & jumlah data per tabel
// ============================================================================
router.get('/status', async (req, res) => {
  try {
    const counts = {};
    for (const table of ALLOWED_TABLES) {
      try {
        const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
        counts[table] = count;
      } catch (err) {
        counts[table] = 0; // Tabel mungkin belum ada data
      }
    }

    res.json({
      status: 'online',
      serverTime: new Date().toISOString(),
      counts,
      authenticatedUser: req.user.username
    });
  } catch (error) {
    console.error('[SYNC] Error getting status:', error);
    res.status(500).json({ error: 'Gagal memeriksa status database.' });
  }
});

// ============================================================================
// GET /api/sync/all — Tarik seluruh data database dalam struktur state aplikasi
// ============================================================================
router.get('/all', async (req, res) => {
  try {
    const state = {};

    for (const table of ALLOWED_TABLES) {
      try {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        if (table === 'profil_sekolah') {
          state[table] = rows.length > 0 ? rows[0] : null;
        } else {
          state[table] = rows;
        }
      } catch (err) {
        state[table] = table === 'profil_sekolah' ? null : [];
      }
    }

    // Ambil users (tanpa password_hash)
    try {
      const [users] = await pool.query('SELECT id, username, nama_lengkap, email, role, guru_id, foto_url, is_active FROM users');
      state.users = users;
    } catch (err) {
      state.users = [];
    }

    res.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SYNC] Error fetching all data:', error);
    res.status(500).json({ error: 'Gagal menarik seluruh data dari server.' });
  }
});

// ============================================================================
// POST /api/sync/all — Dorong & perbarui seluruh state dari klien (Push All)
// ============================================================================
router.post('/all', requireRole('admin'), async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Data payload tidak valid.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let syncedTables = 0;

    // 1. Profil Sekolah
    if (data.profil_sekolah) {
      const p = data.profil_sekolah;
      const [existing] = await conn.query('SELECT id FROM profil_sekolah LIMIT 1');
      if (existing.length > 0) {
        await conn.query(`
          UPDATE profil_sekolah SET
            nama_sekolah = ?, npsn = ?, nss = ?, status_sekolah = ?, akreditasi = ?,
            alamat_lengkap = ?, desa_kelurahan = ?, kecamatan = ?, kabupaten_kota = ?,
            provinsi = ?, kode_pos = ?, telepon = ?, email = ?, website = ?,
            nama_kepala_sekolah = ?, nip_kepala_sekolah = ?, logo_url = ?, stempel_url = ?
          WHERE id = ?
        `, [
          p.nama_sekolah || p.nama || 'SD NEGERI SUMBER WARU 2', p.npsn || '20527136', p.nss || '',
          p.status_sekolah || 'Negeri', p.akreditasi || 'B', p.alamat_lengkap || p.alamat || '',
          p.desa_kelurahan || 'Sumber Waru', p.kecamatan || 'Waru', p.kabupaten_kota || 'Kabupaten Pamekasan',
          p.provinsi || 'Jawa Timur', p.kode_pos || '69353', p.telepon || '', p.email || '', p.website || '',
          p.nama_kepala_sekolah || p.nama_kepsek || '', p.nip_kepala_sekolah || p.nip_kepsek || '',
          p.logo_url || '', p.stempel_url || '', existing[0].id
        ]);
      }
      syncedTables++;
    }

    // 2. Guru Master Data
    if (Array.isArray(data.guru)) {
      for (const g of data.guru) {
        const [exists] = await conn.query('SELECT id FROM guru WHERE id = ?', [g.id]);
        if (exists.length > 0) {
          const { sql, values } = buildUpdate('guru', g);
          await conn.execute(sql, values);
        } else {
          const { sql, values } = buildInsert('guru', g);
          await conn.execute(sql, values);
        }
      }
      syncedTables++;
    }

    // 3. Child tables
    const childTables = ['kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'];
    for (const table of childTables) {
      if (Array.isArray(data[table])) {
        for (const item of data[table]) {
          const [exists] = await conn.query(`SELECT id FROM \`${table}\` WHERE id = ?`, [item.id]);
          if (exists.length > 0) {
            const { sql, values } = buildUpdate(table, item);
            await conn.execute(sql, values);
          } else {
            const { sql, values } = buildInsert(table, item);
            await conn.execute(sql, values);
          }
        }
        syncedTables++;
      }
    }

    // 4. Pengaturan Aplikasi
    if (data.pengaturan_aplikasi) {
      const pa = data.pengaturan_aplikasi;
      const [existingPa] = await conn.query('SELECT id FROM pengaturan_aplikasi LIMIT 1');
      if (existingPa.length > 0) {
        await conn.query(`
          UPDATE pengaturan_aplikasi SET
            logo_sekolah = ?, ttd_kepala_sekolah = ?,
            warna_utama_aplikasi = ?, warna_tema_idcard = ?
          WHERE id = ?
        `, [
          pa.logo_sekolah || '', pa.ttd_kepala_sekolah || '',
          pa.warna_utama_aplikasi || '#2563eb', pa.warna_tema_idcard || '#0f172a',
          existingPa[0].id
        ]);
      } else {
        await conn.query(`
          INSERT INTO pengaturan_aplikasi (logo_sekolah, ttd_kepala_sekolah, warna_utama_aplikasi, warna_tema_idcard)
          VALUES (?, ?, ?, ?)
        `, [
          pa.logo_sekolah || '', pa.ttd_kepala_sekolah || '',
          pa.warna_utama_aplikasi || '#2563eb', pa.warna_tema_idcard || '#0f172a'
        ]);
      }
      syncedTables++;
    }

    await conn.commit();

    // 📡 Broadcast realtime: batch sync selesai
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    SocketServer.notifySync('all', syncedTables, actor);

    res.json({ success: true, message: `Sinkronisasi menyeluruh berhasil diproses (${syncedTables} entitas).`, timestamp: new Date().toISOString() });
  } catch (error) {
    await conn.rollback();
    console.error('[SYNC ALL] Error:', error);
    res.status(500).json({ error: error.message || 'Gagal menyinkronkan data menyeluruh.' });
  } finally {
    conn.release();
  }
});

// ============================================================================
// POST /api/sync/changes — Batch Sync antrean offline (SyncQueue)
// ============================================================================
router.post('/changes', async (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.changes)) {
    return res.status(400).json({ error: 'Payload tidak valid. changes harus berupa array.' });
  }

  const changes = payload.changes;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const results = [];

    for (const change of changes) {
      const { op, table: rawTable, data, tempId } = change;
      const targetTable = TABLE_MAPPING[rawTable] || rawTable;

      if (!ALLOWED_TABLES.has(targetTable)) {
        throw new Error(`Tabel tidak diizinkan untuk sinkronisasi: ${targetTable}`);
      }

      if (op === 'insert') {
        const { sql, values } = buildInsert(targetTable, data);
        const [result] = await conn.execute(sql, values);
        results.push({ tempId: tempId || null, id: result.insertId, table: targetTable, op });
      } else if (op === 'update') {
        const { sql, values } = buildUpdate(targetTable, data);
        await conn.execute(sql, values);
        results.push({ tempId: tempId || null, id: data.id, table: targetTable, op });
      } else if (op === 'delete') {
        if (!data || !data.id) throw new Error('Field ID diperlukan untuk operasi delete');
        await conn.execute(`DELETE FROM \`${targetTable}\` WHERE id = ?`, [data.id]);
        results.push({ tempId: null, id: data.id, table: targetTable, op });
      } else {
        throw new Error(`Operasi tidak didukung: ${op}`);
      }
    }

    await conn.commit();

    // 📡 Broadcast realtime: offline queue synced
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    const affectedTables = [...new Set(results.map(r => r.table))];
    affectedTables.forEach(tbl => SocketServer.notifySync(tbl, results.filter(r => r.table === tbl).length, actor));

    res.json({ success: true, results, appliedAt: new Date().toISOString(), processed: changes.length });
  } catch (err) {
    await conn.rollback();
    console.error('[SYNC ERROR]', err);
    res.status(500).json({ error: err.message || 'Sinkronisasi perubahan gagal.' });
  } finally {
    conn.release();
  }
});

// ============================================================================
// GET /api/sync/changes — Incremental delta pull
// ============================================================================
router.get('/changes', async (req, res) => {
  const { since, table } = req.query;
  if (!since || !table) return res.status(400).json({ error: 'Parameter since dan table wajib diisi.' });
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: 'Tabel tidak diizinkan.' });

  try {
    const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 1000`, [since]);
    res.json({ success: true, data: rows, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[SYNC GET ERROR]', err);
    res.status(500).json({ error: err.message || 'Gagal mengambil perubahan.' });
  }
});

module.exports = router;
