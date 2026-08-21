/**
 * ============================================================================
 * SKRIP OTOMATIS SETUP & INISIALISASI DATABASE MYSQL
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.DB_PASS || '');
const DB_NAME = process.env.DB_NAME || process.env.DB_DATABASE || 'db_guru_sd';

async function setupDatabase() {
  console.log('============================================================');
  console.log('  🛠️  SETUP & INISIALISASI DATABASE SDN SUMBER WARU 2');
  console.log('============================================================');
  console.log(`  Host     : ${DB_HOST}:${DB_PORT}`);
  console.log(`  User     : ${DB_USER}`);
  console.log(`  Database : ${DB_NAME}`);
  console.log('------------------------------------------------------------');

  let connection;
  try {
    // 1. Koneksi ke MySQL Server (tanpa memilih database)
    console.log('[1/4] Menghubungkan ke MySQL Server...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    console.log('      ✓ Berhasil terhubung ke server MySQL.');

    // 2. Buat Database jika belum ada
    console.log(`[2/4] Memeriksa & membuat database \`${DB_NAME}\`...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`      ✓ Database \`${DB_NAME}\` siap.`);

    // Pindah ke database target
    await connection.changeUser({ database: DB_NAME });

    // 3. Eksekusi Skema Tabel SQL (001_initial_schema.sql)
    console.log('[3/4] Mengimpor skema 15 tabel database...');
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(sql);
      console.log('      ✓ Seluruh 15 tabel berhasil dibuat / diverifikasi.');
    } else {
      console.warn('      ⚠️ File 001_initial_schema.sql tidak ditemukan.');
    }

    // 4. Inisialisasi Akun Pengguna Bawaan (Users Seeder)
    console.log('[4/4] Memeriksa akun pengguna awal (Admin, Operator, Guru)...');
    const [existingUsers] = await connection.query('SELECT COUNT(*) AS count FROM users');
    if (existingUsers[0].count === 0) {
      const hashAdmin = await bcrypt.hash('admin123', 10);
      const hashOperator = await bcrypt.hash('operator123', 10);
      const hashGuru = await bcrypt.hash('guru123', 10);

      const usersData = [
        [1, 'admin', hashAdmin, 'Administrator Utama (KS)', 'admin@sdnsumberwaru2.sch.id', 'admin', null, true],
        [2, 'operator', hashOperator, 'Ahmad Fauzi (Operator Dapodik)', 'operator@sdnsumberwaru2.sch.id', 'operator', 6, true],
        [3, 'guru1', hashGuru, 'Siti Rahmawati, S.Pd., Gr.', 'siti.rahma@sdnsumberwaru2.sch.id', 'guru', 2, true],
        [4, 'guru2', hashGuru, 'Budi Santoso, S.Pd.', 'budi.santoso@sdnsumberwaru2.sch.id', 'guru', 3, true],
      ];

      await connection.query(
        'INSERT INTO users (id, username, password_hash, nama_lengkap, email, role, guru_id, is_active) VALUES ?',
        [usersData]
      );
      console.log('      ✓ 4 Akun pengguna demo berhasil dibuat.');
    } else {
      console.log(`      ✓ Tabel users sudah berisi ${existingUsers[0].count} pengguna.`);
    }

    console.log('============================================================');
    console.log('  🎉 SETUP DATABASE SELESAI DENGAN SUKSES!');
    console.log('============================================================');
  } catch (error) {
    console.error('\n❌ ERROR SAAT SETUP DATABASE:');
    console.error(`   ${error.message}`);
    console.log('\n💡 TIPS PENYELESAIAN:');
    console.log('   1. Pastikan XAMPP / MySQL Service sudah diaktifkan (running).');
    console.log('   2. Periksa kecocokan DB_HOST, DB_USER, DB_PASSWORD di file backend/.env.');
    console.log('   3. Default MySQL XAMPP: User "root" dengan password kosong ("").');
    console.log('============================================================\n');
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
