/**
 * ============================================================================
 * ROUTE: State Synchronization & Offline Queue Handler (PostgreSQL)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * 
 * Revisi Menyeluruh (v2):
 * - IGNORED_FIELDS bersifat per-tabel, bukan global, agar nama_lengkap/nip/nuptk
 *   tidak terbuang saat sinkronisasi tabel 'guru'.
 * - Tambahkan sinkronisasi tabel 'users' dengan hashing password bcrypt.
 * - Perbaikan pengaturan_aplikasi: simpan seluruh objek konfigurasi sebagai JSONB.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { verifyToken, requireRole } = require('../middleware/auth');
const SocketServer = require('../socket');

// ============================================================================
// KONFIGURASI TABEL & FIELD
// ============================================================================

const ALLOWED_TABLES = new Set([
  'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
  'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan',
  'dokumen', 'audit_logs', 'profil_sekolah', 'pengaturan_aplikasi', 'users'
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
  pengaturan: 'pengaturan_aplikasi', users: 'users'
};

/**
 * Field yang dibuang secara GLOBAL (selalu diabaikan untuk semua tabel)
 * Field join/virtual dari JOIN query — bukan kolom asli tabel
 */
const GLOBAL_IGNORED_FIELDS = new Set([
  'id', 'created_at', 'updated_at',
  // Field virtual dari hasil JOIN (mis: absensi JOIN guru)
  'nama_guru', 'foto_guru'
]);

/**
 * Field yang dibuang secara LOKAL untuk tabel tertentu saja
 * Misalnya: 'nama_lengkap' diabaikan untuk absensi (virtual dari JOIN),
 * tapi TIDAK diabaikan untuk 'guru' (kolom asli).
 */
const TABLE_IGNORED_FIELDS = {
  absensi:         new Set(['nama_lengkap', 'nuptk', 'nip']),
  kepegawaian:     new Set(['nama_lengkap', 'gelar_depan', 'gelar_belakang', 'nuptk', 'nip']),
  pendidikan:      new Set(['nama_lengkap']),
  sertifikasi:     new Set(['nama_lengkap', 'nuptk', 'nip']),
  jadwal_mengajar: new Set(['nama_lengkap', 'nuptk', 'nip']),
  beban_mengajar:  new Set(['nama_lengkap']),
  pkg:             new Set(['nama_lengkap', 'nuptk', 'nip']),
  prestasi:        new Set(['nama_lengkap']),
  pelatihan:       new Set(['nama_lengkap']),
  dokumen:         new Set(['nama_lengkap']),
};

/**
 * Cek apakah sebuah field harus diabaikan untuk tabel tertentu
 */
function isIgnoredField(table, field) {
  if (GLOBAL_IGNORED_FIELDS.has(field)) return true;
  const tableIgnored = TABLE_IGNORED_FIELDS[table];
  if (tableIgnored && tableIgnored.has(field)) return true;
  return false;
}

// ============================================================================
// QUERY BUILDER
// ============================================================================

function buildInsert(table, data) {
  const keys = Object.keys(data).filter(k => {
    if (isIgnoredField(table, k)) return false;
    const val = data[k];
    // Buang field object/array kecuali jika tabel mengizinkan JSONB (pengaturan_aplikasi)
    if (typeof val === 'object' && val !== null) return false;
    return true;
  });

  if (keys.length === 0) throw new Error(`Tidak ada kolom valid untuk INSERT ke tabel ${table}`);

  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING id`;
  return { sql, values };
}

function buildUpdate(table, data) {
  const id = data.id;
  if (!id) throw new Error(`Field ID diperlukan untuk UPDATE tabel ${table}`);

  const keys = Object.keys(data).filter(k => {
    if (k === 'id') return false; // ID tidak diupdate
    if (isIgnoredField(table, k)) return false;
    const val = data[k];
    if (typeof val === 'object' && val !== null) return false;
    return true;
  });

  if (keys.length === 0) throw new Error(`Tidak ada kolom valid untuk UPDATE tabel ${table}`);

  const set = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const sql = `UPDATE "${table}" SET ${set}, updated_at = NOW() WHERE id = $${values.length + 1}`;
  values.push(id);
  return { sql, values };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

router.use(verifyToken);

// ============================================================================
// GET /api/sync/status — Status server & jumlah data
// ============================================================================
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

// ============================================================================
// GET /api/sync/all — Tarik seluruh data dari server
// ============================================================================
router.get('/all', async (req, res) => {
  try {
    const state = {};

    // Tabel koleksi (array)
    const collectionTables = [
      'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
      'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'
    ];

    for (const table of collectionTables) {
      try {
        const { rows } = await pool.query(`SELECT * FROM "${table}" WHERE is_deleted = 0 OR is_deleted IS NULL`);
        state[table] = rows;
      } catch (err) {
        console.warn(`[SYNC GET] Gagal membaca tabel ${table}:`, err.message);
        state[table] = [];
      }
    }

    // Profil sekolah (objek tunggal)
    try {
      const { rows } = await pool.query('SELECT * FROM profil_sekolah LIMIT 1');
      state.profil_sekolah = rows.length > 0 ? rows[0] : null;
    } catch (err) {
      state.profil_sekolah = null;
    }

    // Users (tanpa password_hash — keamanan)
    try {
      const { rows } = await pool.query(
        'SELECT id, username, nama_lengkap, email, role, guru_id, foto_url, is_active, updated_at FROM users ORDER BY id ASC'
      );
      state.users = rows;
    } catch (err) {
      state.users = [];
    }

    // Pengaturan aplikasi (gabung semua kolom dalam satu objek)
    try {
      const { rows } = await pool.query('SELECT * FROM pengaturan_aplikasi WHERE setting_key = $1 LIMIT 1', ['__app_config__']);
      if (rows.length > 0) {
        const r = rows[0];
        state.pengaturan_aplikasi = {
          logo_sekolah: r.logo_sekolah || '',
          ttd_kepala_sekolah: r.ttd_kepala_sekolah || '',
          warna_utama_aplikasi: r.warna_utama_aplikasi || '#2563eb',
          warna_tema_idcard: r.warna_tema_idcard || '#0f172a'
        };
        // Kembalikan konfigurasi JSONB sebagai objek terpisah
        if (r.konfigurasi_sistem) state.konfigurasi_sistem = r.konfigurasi_sistem;
        if (r.integrasi) state.integrasi = r.integrasi;
        if (r.pengaturan_absensi) state.pengaturan_absensi = r.pengaturan_absensi;
      } else {
        state.pengaturan_aplikasi = null;
      }
    } catch (err) {
      console.warn('[SYNC GET] Gagal membaca pengaturan_aplikasi:', err.message);
      state.pengaturan_aplikasi = null;
    }

    res.json({ success: true, data: state, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[SYNC] Error fetching all data:', error);
    res.status(500).json({ error: 'Gagal menarik seluruh data dari server.' });
  }
});

// ============================================================================
// POST /api/sync/all — Dorong seluruh data lokal ke server (admin only)
// ============================================================================
router.post('/all', requireRole(['admin']), async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Data payload tidak valid.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let syncedTables = 0;

    // ── 1. Profil Sekolah ──────────────────────────────────────────────────
    if (data.profil_sekolah && typeof data.profil_sekolah === 'object') {
      const p = data.profil_sekolah;
      const { rows: existing } = await client.query('SELECT id FROM profil_sekolah LIMIT 1');
      if (existing.length > 0) {
        await client.query(`
          UPDATE profil_sekolah SET
            nama_sekolah = $1, npsn = $2, nss = $3, status_sekolah = $4,
            bentuk_pendidikan = $5, akreditasi = $6, alamat_lengkap = $7,
            desa_kelurahan = $8, kecamatan = $9, kabupaten_kota = $10,
            provinsi = $11, kode_pos = $12, telepon = $13, email = $14,
            website = $15, nama_kepala_sekolah = $16, nip_kepala_sekolah = $17,
            updated_at = NOW()
          WHERE id = $18
        `, [
          p.nama_sekolah || 'SD NEGERI SUMBER WARU 2',
          p.npsn || '20527136', p.nss || '',
          p.status_sekolah || 'Negeri',
          p.bentuk_pendidikan || 'Sekolah Dasar (SD)',
          p.akreditasi || 'B',
          p.alamat_lengkap || p.alamat || '',
          p.desa_kelurahan || 'Sumber Waru', p.kecamatan || 'Waru',
          p.kabupaten_kota || 'Kabupaten Pamekasan',
          p.provinsi || 'Jawa Timur', p.kode_pos || '69353',
          p.telepon || '', p.email || '', p.website || '',
          p.nama_kepala_sekolah || p.nama_kepsek || '',
          p.nip_kepala_sekolah || p.nip_kepsek || '',
          existing[0].id
        ]);
      }
      syncedTables++;
    }

    // ── 2. Guru (nama_lengkap, nip, nuptk WAJIB disertakan) ───────────────
    if (Array.isArray(data.guru)) {
      for (const g of data.guru) {
        if (!g.nama_lengkap) continue; // Skip data rusak tanpa nama
        const { rows: exists } = await client.query('SELECT id FROM guru WHERE id = $1', [g.id]);
        if (exists.length > 0) {
          const { sql, values } = buildUpdate('guru', g);
          await client.query(sql, values);
        } else {
          // Untuk INSERT guru, nama_lengkap harus termasuk
          const guruData = { ...g };
          delete guruData.id; // Biarkan SERIAL generate ID baru jika ID tidak ada di DB
          const { sql, values } = buildInsert('guru', g);
          await client.query(sql, values);
        }
      }
      syncedTables++;
    }

    // ── 3. Tabel turunan (child) ───────────────────────────────────────────
    const childTables = [
      'kepegawaian', 'pendidikan', 'sertifikasi', 'jadwal_mengajar',
      'beban_mengajar', 'absensi', 'pkg', 'prestasi', 'pelatihan', 'dokumen', 'audit_logs'
    ];
    for (const table of childTables) {
      if (Array.isArray(data[table])) {
        for (const item of data[table]) {
          try {
            const { rows: exists } = await client.query(`SELECT id FROM "${table}" WHERE id = $1`, [item.id]);
            if (exists.length > 0) {
              const { sql, values } = buildUpdate(table, item);
              await client.query(sql, values);
            } else {
              const { sql, values } = buildInsert(table, item);
              await client.query(sql, values);
            }
          } catch (rowErr) {
            console.warn(`[SYNC ALL] Gagal sinkronisasi baris ${table}:`, rowErr.message);
          }
        }
        syncedTables++;
      }
    }

    // ── 4. Users (dengan hash password jika ada password plaintext) ────────
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        const { rows: exists } = await client.query('SELECT id FROM users WHERE username = $1', [u.username]);

        // Tangani password: hash jika ada plaintext baru, abaikan jika tidak ada
        let passwordHash = null;
        if (u.password && typeof u.password === 'string' && u.password.length > 0 && !u.password.startsWith('$2')) {
          passwordHash = await bcrypt.hash(u.password, 10);
        }

        if (exists.length > 0) {
          // Update — hanya ubah field yang diperbolehkan
          const updateFields = [];
          const updateValues = [];
          let idx = 1;

          if (u.nama_lengkap)  { updateFields.push(`nama_lengkap = $${idx++}`);  updateValues.push(u.nama_lengkap); }
          if (u.email)         { updateFields.push(`email = $${idx++}`);          updateValues.push(u.email); }
          if (u.role)          { updateFields.push(`role = $${idx++}`);           updateValues.push(u.role); }
          if (u.guru_id !== undefined) { updateFields.push(`guru_id = $${idx++}`); updateValues.push(u.guru_id || null); }
          if (u.is_active !== undefined) { updateFields.push(`is_active = $${idx++}`); updateValues.push(!!u.is_active || u.status === 'aktif'); }
          if (passwordHash)    { updateFields.push(`password_hash = $${idx++}`);  updateValues.push(passwordHash); }

          if (updateFields.length > 0) {
            updateValues.push(exists[0].id);
            await client.query(
              `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
              updateValues
            );
          }
        } else {
          // Insert user baru — password wajib ada
          const finalHash = passwordHash || await bcrypt.hash(u.password || 'guru123', 10);
          await client.query(`
            INSERT INTO users (username, password_hash, nama_lengkap, email, role, guru_id, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [
            u.username, finalHash,
            u.nama_lengkap || u.username,
            u.email || null,
            u.role || 'guru',
            u.guru_id || null,
            u.is_active !== undefined ? !!u.is_active : (u.status === 'aktif' || true)
          ]);
        }
      }
      syncedTables++;
    }

    // ── 5. Pengaturan Aplikasi & Konfigurasi (JSONB columns) ──────────────
    const pa = data.pengaturan_aplikasi || {};
    const ks = data.konfigurasi_sistem || {};
    const integrasi = data.integrasi || {};
    const pabsensi = data.pengaturan_absensi || {};

    try {
      const { rows: existingPa } = await client.query(
        "SELECT id FROM pengaturan_aplikasi WHERE setting_key = '__app_config__' LIMIT 1"
      );
      if (existingPa.length > 0) {
        await client.query(`
          UPDATE pengaturan_aplikasi SET
            logo_sekolah = $1,
            ttd_kepala_sekolah = $2,
            warna_utama_aplikasi = $3,
            warna_tema_idcard = $4,
            konfigurasi_sistem = $5,
            integrasi = $6,
            pengaturan_absensi = $7,
            updated_at = NOW()
          WHERE setting_key = '__app_config__'
        `, [
          pa.logo_sekolah || '',
          pa.ttd_kepala_sekolah || '',
          pa.warna_utama_aplikasi || '#2563eb',
          pa.warna_tema_idcard || '#0f172a',
          JSON.stringify(ks),
          JSON.stringify(integrasi),
          JSON.stringify(pabsensi)
        ]);
      } else {
        await client.query(`
          INSERT INTO pengaturan_aplikasi
            (setting_key, setting_value, logo_sekolah, ttd_kepala_sekolah,
             warna_utama_aplikasi, warna_tema_idcard,
             konfigurasi_sistem, integrasi, pengaturan_absensi, updated_at)
          VALUES ('__app_config__', 'v2', $1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          pa.logo_sekolah || '',
          pa.ttd_kepala_sekolah || '',
          pa.warna_utama_aplikasi || '#2563eb',
          pa.warna_tema_idcard || '#0f172a',
          JSON.stringify(ks),
          JSON.stringify(integrasi),
          JSON.stringify(pabsensi)
        ]);
      }
      syncedTables++;
    } catch (configErr) {
      console.warn('[SYNC ALL] Gagal sinkronisasi pengaturan_aplikasi:', configErr.message);
    }

    await client.query('COMMIT');

    const actor = { username: req.user?.username, name: req.user?.nama_lengkap || req.user?.username };
    try { SocketServer.notifySync('all', syncedTables, actor); } catch {}

    res.json({
      success: true,
      message: `Sinkronisasi menyeluruh berhasil (${syncedTables} entitas).`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SYNC ALL] Error:', error);
    res.status(500).json({ error: error.message || 'Gagal menyinkronkan data menyeluruh.' });
  } finally {
    client.release();
  }
});

// ============================================================================
// POST /api/sync/changes — Terapkan perubahan baris (offline queue)
// ============================================================================
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
        if (!ALLOWED_TABLES.has(targetTable)) {
          throw new Error(`Tabel tidak diizinkan untuk sinkronisasi: ${targetTable}`);
        }

        if (op === 'insert') {
          // Khusus users: hash password terlebih dahulu
          if (targetTable === 'users') {
            const userPayload = { ...data };
            if (userPayload.password && !userPayload.password.startsWith('$2')) {
              userPayload.password_hash = await bcrypt.hash(userPayload.password, 10);
            }
            delete userPayload.password;
            delete userPayload.status;
            const { sql, values } = buildInsert(targetTable, userPayload);
            const { rows } = await client.query(sql, values);
            results.push({ tempId: tempId || null, id: rows[0].id, table: targetTable, op, success: true });
          } else {
            const { sql, values } = buildInsert(targetTable, data);
            const { rows } = await client.query(sql, values);
            results.push({ tempId: tempId || null, id: rows[0].id, table: targetTable, op, success: true });
          }
        } else if (op === 'update') {
          if (targetTable === 'users') {
            const userPayload = { ...data };
            if (userPayload.password && !userPayload.password.startsWith('$2')) {
              userPayload.password_hash = await bcrypt.hash(userPayload.password, 10);
            }
            delete userPayload.password;
            delete userPayload.status;
            const { sql, values } = buildUpdate(targetTable, userPayload);
            await client.query(sql, values);
            results.push({ tempId: tempId || null, id: data.id, table: targetTable, op, success: true });
          } else {
            const { sql, values } = buildUpdate(targetTable, data);
            await client.query(sql, values);
            results.push({ tempId: tempId || null, id: data.id, table: targetTable, op, success: true });
          }
        } else if (op === 'delete') {
          if (!data || !data.id) throw new Error('Field ID diperlukan untuk operasi delete');
          // users: soft delete melalui is_active = false
          if (targetTable === 'users') {
            await client.query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [data.id]);
          } else {
            await client.query(
              `UPDATE "${targetTable}" SET is_deleted = 1, updated_at = NOW() WHERE id = $1`,
              [data.id]
            );
          }
          results.push({ tempId: null, id: data.id, table: targetTable, op, success: true });
        } else {
          throw new Error(`Operasi tidak didukung: ${op}`);
        }

        await client.query('RELEASE SAVEPOINT row_savepoint');
      } catch (rowErr) {
        await client.query('ROLLBACK TO SAVEPOINT row_savepoint');
        console.warn(`[SYNC] Gagal memproses ${targetTable} (op: ${op}):`, rowErr.message);
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

// ============================================================================
// GET /api/sync/changes — Ambil perubahan sejak timestamp tertentu
// ============================================================================
router.get('/changes', async (req, res) => {
  const { since, table } = req.query;
  if (!since || !table) return res.status(400).json({ error: 'Parameter since dan table wajib diisi.' });
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ error: 'Tabel tidak diizinkan.' });

  try {
    // Tabel audit_logs tidak punya updated_at, gunakan created_at
    const timeCol = table === 'audit_logs' ? 'created_at' : 'updated_at';
    const { rows } = await pool.query(
      `SELECT * FROM "${table}" WHERE ${timeCol} > $1 ORDER BY ${timeCol} ASC LIMIT 1000`,
      [since]
    );
    res.json({ success: true, data: rows, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[SYNC GET ERROR]', err);
    res.status(500).json({ error: err.message || 'Gagal mengambil perubahan.' });
  }
});

module.exports = router;
