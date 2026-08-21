/**
 * ============================================================================
 * SKRIP SETUP OTOMATIS DATABASE — SD NEGERI SUMBER WARU 2 (PostgreSQL)
 * Membuat tabel dan akun pengguna demo secara otomatis.
 *
 * Cara menjalankan:
 *   cd backend
 *   npm run db:setup
 * ============================================================================
 */

'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function setupDatabase() {
  console.log('\n============================================================');
  console.log('  🛠️   SETUP & INISIALISASI DATABASE SDN SUMBER WARU 2');
  console.log('============================================================');
  console.log(`  Database URL : ${connectionString ? 'Terkonfigurasi' : 'Tidak Ditemukan'}`);
  console.log('------------------------------------------------------------\n');

  if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL tidak ditemukan di file .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    process.stdout.write('[1/4] Menghubungkan ke server PostgreSQL... ');
    await client.connect();
    console.log('✅ Berhasil!');

    process.stdout.write('[2/4] Mengimpor skema 15 tabel... ');
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ File 001_initial_schema.sql tidak ditemukan!');
      process.exit(1);
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('✅ Selesai!');

    process.stdout.write('[3/4] Memeriksa data profil sekolah awal... ');
    const { rows: profilRows } = await client.query('SELECT COUNT(*) AS count FROM profil_sekolah');
    if (parseInt(profilRows[0].count) === 0) {
      await client.query(`
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

    process.stdout.write('[4/4] Memeriksa akun pengguna awal... ');
    const { rows: userRows } = await client.query('SELECT COUNT(*) AS count FROM users');
    if (parseInt(userRows[0].count) === 0) {
      const hashAdmin    = await bcrypt.hash('admin123',    10);
      const hashOperator = await bcrypt.hash('operator123', 10);
      const hashGuru     = await bcrypt.hash('guru123',     10);

      const insertQuery = `
        INSERT INTO users (username, password_hash, nama_lengkap, email, role, is_active)
        VALUES
          ('admin', $1, 'Administrator Utama (KS)', 'admin@sdnsumberwaru2.sch.id', 'admin', true),
          ('operator', $2, 'Ahmad Fauzi (Operator Dapodik)', 'operator@sdnsumberwaru2.sch.id', 'operator', true),
          ('guru1', $3, 'Siti Rahmawati, S.Pd., Gr.', 'siti.rahma@sdnsumberwaru2.sch.id', 'guru', true),
          ('guru2', $3, 'Budi Santoso, S.Pd.', 'budi.santoso@sdnsumberwaru2.sch.id', 'guru', true)
      `;
      await client.query(insertQuery, [hashAdmin, hashOperator, hashGuru]);
      console.log('✅ 4 akun demo dibuat!');
    } else {
      console.log(`✅ Sudah ada ${userRows[0].count} pengguna.`);
    }

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
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n\n❌ ERROR SAAT SETUP DATABASE:');
    console.error('--------------------------------------------------');
    console.error(`  Pesan  : ${error.message}`);
    console.error('--------------------------------------------------\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
