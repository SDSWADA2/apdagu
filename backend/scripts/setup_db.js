/**
 * ============================================================================
 * SKRIP SETUP OTOMATIS DATABASE — SD NEGERI SUMBER WARU 2
 * Membuat database, 15 tabel, dan akun pengguna demo secara otomatis.
 *
 * Cara menjalankan:
 *   cd backend
 *   npm run db:setup
 * ============================================================================
 */

'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Muat variabel environment dari backend/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.DB_PASS || '');
const DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE || 'db_guru_sd';

async function setupDatabase() {
  console.log('\n============================================================');
  console.log('  🛠️   SETUP & INISIALISASI DATABASE SDN SUMBER WARU 2');
  console.log('============================================================');
  console.log(`  Host       : ${DB_HOST}:${DB_PORT}`);
  console.log(`  User       : ${DB_USER}`);
  console.log(`  Database   : ${DB_NAME}`);
  console.log('------------------------------------------------------------\n');

  let connection;
  try {
    // ========================================================================
    // LANGKAH 1 — Koneksi ke server MySQL tanpa memilih database
    // ========================================================================
    process.stdout.write('[1/5] Menghubungkan ke server MySQL... ');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
      charset: 'utf8mb4',
    });
    console.log('✅ Berhasil!');

    // ========================================================================
    // LANGKAH 2 — Buat database jika belum ada
    // ========================================================================
    process.stdout.write(`[2/5] Membuat database \`${DB_NAME}\`... `);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('✅ Siap!');

    // Pindah ke database target
    await connection.changeUser({ database: DB_NAME });

    // ========================================================================
    // LANGKAH 3 — Eksekusi skema DDL 15 tabel
    // ========================================================================
    process.stdout.write('[3/5] Mengimpor skema 15 tabel... ');
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ File 001_initial_schema.sql tidak ditemukan!');
      process.exit(1);
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(sql);
    console.log('✅ Selesai!');

    // ========================================================================
    // LANGKAH 4 — Seed data profil sekolah awal
    // ========================================================================
    process.stdout.write('[4/5] Memeriksa data profil sekolah awal... ');
    const [[{ profilCount }]] = await connection.query('SELECT COUNT(*) AS profilCount FROM profil_sekolah');
    if (profilCount === 0) {
      await connection.query(`
        INSERT INTO profil_sekolah
          (npsn, nss, nama_sekolah, status_sekolah, bentuk_pendidikan, akreditasi,
           alamat_lengkap, desa_kelurahan, kecamatan, kabupaten_kota, provinsi,
           kode_pos, telepon, email, website, nama_kepala_sekolah, nip_kepala_sekolah)
        VALUES
          ('20527136', '101052610041', 'SD NEGERI SUMBER WARU 2', 'Negeri', 'Sekolah Dasar (SD)', 'B (Baik)',
           'Jln 2, Sumber Waru 1, Sumber Waru, Kec. Waru, Kabupaten Pamekasan, Jawa Timur', 'Sumber Waru', 'Waru', 'Kabupaten Pamekasan', 'Jawa Timur',
           '69353', '081953812155', 'sdnegerisumberwaru2official@gmail.com', 'https://sdnsumberwaru2.sch.id', 'FAUZAN, S.Pd.SD', '19720602 199605 1 001')
      `);
      console.log('✅ Data profil awal sekolah dibuat!');
    } else {
      console.log('✅ Sudah ada.');
    }

    // ========================================================================
    // LANGKAH 5 — Seed akun pengguna awal
    // ========================================================================
    process.stdout.write('[5/5] Memeriksa akun pengguna awal... ');
    const [[{ userCount }]] = await connection.query('SELECT COUNT(*) AS userCount FROM users');
    if (userCount === 0) {
      const hashAdmin    = await bcrypt.hash('admin123',    10);
      const hashOperator = await bcrypt.hash('operator123', 10);
      const hashGuru     = await bcrypt.hash('guru123',     10);

      await connection.query(
        `INSERT INTO users (username, password_hash, nama_lengkap, email, role, guru_id, is_active) VALUES ?`,
        [[
          ['admin',    hashAdmin,    'Administrator Utama (KS)',        'admin@sdnsumberwaru2.sch.id',        'admin',    null, true],
          ['operator', hashOperator, 'Ahmad Fauzi (Operator Dapodik)',  'operator@sdnsumberwaru2.sch.id',     'operator', null, true],
          ['guru1',    hashGuru,     'Siti Rahmawati, S.Pd., Gr.',     'siti.rahma@sdnsumberwaru2.sch.id',   'guru',     null, true],
          ['guru2',    hashGuru,     'Budi Santoso, S.Pd.',            'budi.santoso@sdnsumberwaru2.sch.id', 'guru',     null, true],
        ]]
      );
      console.log('✅ 4 akun demo dibuat!');
    } else {
      console.log(`✅ Sudah ada ${userCount} pengguna.`);
    }

    // ========================================================================
    // RINGKASAN AKHIR
    // ========================================================================
    console.log('\n============================================================');
    console.log('  🎉  SETUP DATABASE BERHASIL DISELESAIKAN!');
    console.log('============================================================');
    console.log('');
    console.log('  📌 Akun Login Demo:');
    console.log('     Admin    : admin    / admin123');
    console.log('     Operator : operator / operator123');
    console.log('     Guru     : guru1    / guru123');
    console.log('');
    console.log('  🚀 Jalankan server: npm run dev');
    console.log('  🌐 Akses API      : http://localhost:3000');
    console.log('  🔍 Health check   : http://localhost:3000/health');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n\n❌ ERROR SAAT SETUP DATABASE:');
    console.error('--------------------------------------------------');
    console.error(`  Kode   : ${error.code || 'UNKNOWN'}`);
    console.error(`  Pesan  : ${error.message}`);
    console.error('--------------------------------------------------\n');

    console.log('💡 PANDUAN PENYELESAIAN MASALAH UMUM:');
    if (error.code === 'ECONNREFUSED') {
      console.log('  → MySQL / MariaDB belum berjalan!');
      console.log('  → Buka XAMPP Control Panel → klik tombol "Start" pada MySQL');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('  → Username atau password MySQL salah!');
      console.log('  → Periksa DB_USER dan DB_PASSWORD di file backend/.env');
      console.log('  → Default XAMPP: DB_USER=root, DB_PASSWORD= (kosong)');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('  → Database tidak ditemukan. Coba jalankan ulang skrip ini.');
    } else {
      console.log('  → Pastikan MySQL aktif dan konfigurasi .env sudah benar.');
    }
    console.log('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Hanya jalankan jika dipanggil langsung (bukan via require)
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
