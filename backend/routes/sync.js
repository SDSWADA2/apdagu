/**
 * ============================================================================
 * ROUTE: State Synchronization & Offline Queue Handler (PostgreSQL)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');

const ALLOWED_TABLES = new Set([
  'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
  'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan',
  'dokumen', 'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi'
]);

const TABLE_MAPPING = {
  guru: 'guru', kepegawaian: 'kepegawaian', pendidikan: 'pendidikan',
  riwayat_pendidikan: 'pendidikan', sertifikasi: 'sertifikasi',
  jadwal: 'jadwal_mengajar', jadwal_mengajar: 'jadwal_mengajar',
  beban: 'beban_mengajar', beban_mengajar: 'beban_mengajar', absensi: 'absensi',
  pkg: 'pkg', penilaian_kinerja_guru: 'pkg', prestasi: 'prestasi',
  prestasi_guru: 'prestasi', pelatihan: 'pelatihan', pelatihan_guru: 'pelatihan',
  dokumen: 'dokumen', dokumen_guru: 'dokumen', audit_logs: 'audit_logs',
  profil_sekolah: 'profil_sekolah', pengaturan_aplikasi: 'pengaturan_aplikasi',
  pengaturan: 'pengaturan_aplikasi'
};

const IGNORED_FIELDS = new Set(['id', 'created_at', 'updated_at', 'nama_guru', 'nuptk', 'nip', 'foto_guru', 'nama_lengkap']);

function buildInsert(table, data) {
  const keys = Object.keys(data).filter(k => {
    if (IGNORED_FIELDS.has(k)) return false;
    const val = data[k];
    return typeof val !== 'object' || val === null;
  });
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING id`;
  return { sql, values };
}

function buildUpdate(table, data) {
  const id = data.id;
  if (!id) throw new Error(`Missing ID for updating table ${table}`);
  const keys = Object.keys(data).filter(k => {
    if (IGNORED_FIELDS.has(k)) return false;
    const val = data[k];
    return typeof val !== 'object' || val === null;
  });
  const set = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `UPDATE "${table}" SET ${set} WHERE id = $${values.length + 1}`;
  values.push(id);
  return { sql, values };
}

router.use(verifyToken);

router.get('/status', async (req, res) => {
  try {
    const counts = {};
    for (const table of ALLOWED_TABLES) {
      try {
        const { rows } = await pool.query(`SELECT COUNT(*) AS count FROM "${table}"`);
        counts[table] = parseInt(rows[0].count);
      } catch (err) {
        counts[table] = 0;
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

router.get('/all', async (req, res) => {
  try {
    const state = {};
    for (const table of ALLOWED_TABLES) {
      try {
        const { rows } = await pool.query(`SELECT * FROM "${table}"`);
        if (table === 'profil_sekolah') {
          state[table] = rows.length > 0 ? rows[0] : null;
        } else {
          state[table] = rows;
        }
      } catch (err) {
        state[table] = table === 'profil_sekolah' ? null : [];
      }
    }
    try {
      const { rows } = await pool.query('SELECT id, username, nama_lengkap, email, role, guru_id, foto_url, is_active FROM users');
      state.users = rows;
    } catch (err) {
      state.users = [];
    }
    res.json({ success: true, data: state, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[SYNC] Error fetching all data:', error);
    res.status(500).json({ error: 'Gagal menarik seluruh data dari server.' });
  }
});

router.post('/all', requireRole(['admin']), async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Data payload tidak valid.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let syncedTables = 0;

    if (data.profil_sekolah) {
      const p = data.profil_sekolah;
      const { rows: existing } = await client.query('SELECT id FROM profil_sekolah LIMIT 1');
      if (existing.length > 0) {
        await client.query(`
          UPDATE profil_sekolah SET
            nama_sekolah = $1, npsn = $2, nss = $3, status_sekolah = $4, akreditasi = $5,
            alamat_lengkap = $6, desa_kelurahan = $7, kecamatan = $8, kabupaten_kota = $9,
            provinsi = $10, kode_pos = $11, telepon = $12, email = $13, website = $14,
            nama_kepala_sekolah = $15, nip_kepala_sekolah = $16, logo_url = $17, stempel_url = $18
          WHERE id = $19
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

    if (Array.isArray(data.guru)) {
      for (const g of data.guru) {
        const { rows: exists } = await client.query('SELECT id FROM guru WHERE id = $1', [g.id]);
        if (exists.length > 0) {
          const { sql, values } = buildUpdate('guru', g);
          await client.query(sql, values);
        } else {
          const { sql, values } = buildInsert('guru', g);
          await client.query(sql, values);
        }
      }
      syncedTables++;
    }

    const childTables = ['kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'];
    for (const table of childTables) {
      if (Array.isArray(data[table])) {
        for (const item of data[table]) {
          const { rows: exists } = await client.query(`SELECT id FROM "${table}" WHERE id = $1`, [item.id]);
          if (exists.length > 0) {
            const { sql, values } = buildUpdate(table, item);
            await client.query(sql, values);
          } else {
            const { sql, values } = buildInsert(table, item);
            await client.query(sql, values);
          }
        }
        syncedTables++;
      }
    }

    if (data.pengaturan_aplikasi) {
      const pa = data.pengaturan_aplikasi;
      const { rows: existingPa } = await client.query('SELECT id FROM pengaturan_aplikasi LIMIT 1');
      if (existingPa.length > 0) {
        await client.query(`
          UPDATE pengaturan_aplikasi SET
            logo_sekolah = $1, ttd_kepala_sekolah = $2,
            warna_utama_aplikasi = $3, warna_tema_idcard = $4
          WHERE id = $5
        `, [
          pa.logo_sekolah || '', pa.ttd_kepala_sekolah || '',
          pa.warna_utama_aplikasi || '#2563eb', pa.warna_tema_idcard || '#0f172a',
          existingPa[0].id
        ]);
      } else {
        await client.query(`
          INSERT INTO pengaturan_aplikasi (logo_sekolah, ttd_kepala_sekolah, warna_utama_aplikasi, warna_tema_idcard)
          VALUES ($1, $2, $3, $4)
        `, [
          pa.logo_sekolah || '', pa.ttd_kepala_sekolah || '',
          pa.warna_utama_aplikasi || '#2563eb', pa.warna_tema_idcard || '#0f172a'
        ]);
      }
      syncedTables++;
    }

    await client.query('COMMIT');
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    try { SocketServer.notifySync('all', syncedTables, actor); } catch {}
    res.json({ success: true, message: `Sinkronisasi menyeluruh berhasil diproses (${syncedTables} entitas).`, timestamp: new Date().toISOString() });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SYNC ALL] Error:', error);
    res.status(500).json({ error: error.message || 'Gagal menyinkronkan data menyeluruh.' });
  } finally {
    client.release();
  }
});

router.post('/changes', async (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.changes)) {
    return res.status(400).json({ error: 'Payload tidak valid. changes harus berupa array.' });
  }

  const changes = payload.changes;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];

    for (const change of changes) {
      const { op, table: rawTable, data, tempId } = change;
      const targetTable = TABLE_MAPPING[rawTable] || rawTable;

      try {
        await client.query('SAVEPOINT row_savepoint');
        if (!ALLOWED_TABLES.has(targetTable)) throw new Error(`Tabel tidak diizinkan untuk sinkronisasi: ${targetTable}`);

        if (op === 'insert') {
          const { sql, values } = buildInsert(targetTable, data);
          const { rows } = await client.query(sql, values);
          results.push({ tempId: tempId || null, id: rows[0].id, table: targetTable, op, success: true });
        } else if (op === 'update') {
          const { sql, values } = buildUpdate(targetTable, data);
          await client.query(sql, values);
          results.push({ tempId: tempId || null, id: data.id, table: targetTable, op, success: true });
        } else if (op === 'delete') {
          if (!data || !data.id) throw new Error('Field ID diperlukan untuk operasi delete');
          await client.query(`UPDATE "${targetTable}" SET is_deleted = true, updated_at = NOW() WHERE id = $1`, [data.id]);
          results.push({ tempId: null, id: data.id, table: targetTable, op, success: true });
        } else {
          throw new Error(`Operasi tidak didukung: ${op}`);
        }
      } catch (rowErr) {
        await client.query('ROLLBACK TO SAVEPOINT row_savepoint');
        console.warn(`[SYNC] Gagal memproses baris untuk ${targetTable} (op: ${op}):`, rowErr.message);
        results.push({ tempId: tempId || null, id: data?.id, table: targetTable, op, success: false, error: rowErr.message });
      }
    }

    await client.query('COMMIT');
    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    const affectedTables = [...new Set(results.map(r => r.table))];
    affectedTables.forEach(tbl => {
      try { SocketServer.notifySync(tbl, results.filter(r => r.table === tbl).length, actor); } catch {}
    });

    res.json({ success: true, results, appliedAt: new Date().toISOString(), processed: changes.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SYNC ERROR]', err);
    res.status(500).json({ error: err.message || 'Sinkronisasi perubahan gagal.' });
  } finally {
    client.release();
  }
});

router.get('/changes', async (req, res) => {
  const { since, table } = req.query;
  if (!since || !table) return res.status(400).json({ error: 'Parameter since dan table wajib diisi.' });
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: 'Tabel tidak diizinkan.' });

  try {
    const { rows } = await pool.query(`SELECT * FROM "${table}" WHERE updated_at > $1 ORDER BY updated_at ASC LIMIT 1000`, [since]);
    res.json({ success: true, data: rows, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[SYNC GET ERROR]', err);
    res.status(500).json({ error: err.message || 'Gagal mengambil perubahan.' });
  }
});

module.exports = router;
