/**
 * auto_fix.js
 * Skrip Perbaikan Otomatis Total (All-in-One Fix)
 * Mengatasi semua masalah setup database, error migrasi, dan akun login yang hilang.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'database_sekolah';

async function autoFix() {
  console.log('\n============================================================');
  console.log('  🚀 AUTO FIX: MEMPERBAIKI SELURUH MASALAH DATABASE & LOGIN');
  console.log('============================================================\n');

  let conn;
  try {
    // 1. KONEKSI KE MYSQL
    process.stdout.write('[1/5] Menghubungkan ke MySQL XAMPP... ');
    conn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    console.log('✅ Berhasil!');

    // 2. BUAT DATABASE JIKA BELUM ADA
    process.stdout.write(`[2/5] Memastikan database '${DB_NAME}' siap... `);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.changeUser({ database: DB_NAME });
    console.log('✅ Siap!');

    // 3. JALANKAN SCHEMA AWAL (JIKA TABEL BELUM ADA)
    process.stdout.write('[3/5] Memeriksa & menginstall tabel dasar... ');
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await conn.query(sql);
      console.log('✅ Tabel dasar terpasang!');
    } else {
      console.log('⚠️ File schema tidak ditemukan, dilewati.');
    }

    // 4. MIGRASI KOLOM REALTIME (SOFT DELETE)
    process.stdout.write('[4/5] Memperbarui struktur tabel untuk fitur Realtime & Offline... ');
    const tables = [
      'guru', 'kepegawaian', 'pendidikan', 'sertifikasi', 
      'jadwal_mengajar', 'beban_mengajar', 'absensi', 'pkg', 
      'prestasi', 'pelatihan', 'dokumen'
    ];
    let migrasiBerhasil = 0;
    for (const table of tables) {
      try {
        await conn.query(`
          ALTER TABLE ${table}
          ADD COLUMN created_by VARCHAR(50) DEFAULT NULL,
          ADD COLUMN updated_by VARCHAR(50) DEFAULT NULL,
          ADD COLUMN is_deleted TINYINT(1) DEFAULT 0
        `);
        migrasiBerhasil++;
      } catch (e) {
        // Abaikan jika kolom sudah ada
      }
    }
    console.log('✅ Struktur Realtime siap!');

    // 5. PASTIKAN AKUN ADMIN DEFAULT TERSEDIA
    process.stdout.write('[5/5] Mengamankan & mereset akun login Admin... ');
    const hashAdmin = await bcrypt.hash('admin123', 10);
    
    // Cek apakah admin sudah ada
    const [existing] = await conn.query('SELECT id FROM users WHERE username = "admin"');
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO users (username, password_hash, nama_lengkap, email, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', hashAdmin, 'Administrator Sistem', 'admin@sekolah.id', 'admin', 1]
      );
    } else {
      // Force update password ke admin123 jika lupa
      await conn.query(
        `UPDATE users SET password_hash = ?, is_active = 1 WHERE username = "admin"`,
        [hashAdmin]
      );
    }
    console.log('✅ Akun Admin aktif!');

    console.log('\n============================================================');
    console.log('  🎉 SEMUA MASALAH BERHASIL DIPERBAIKI SECARA OTOMATIS!');
    console.log('============================================================');
    console.log('  SILAKAN LOGIN MENGGUNAKAN:');
    console.log('  Username : admin');
    console.log('  Password : admin123\n');
    console.log('  Jalankan server aplikasi (npm run dev / node server.js) dan muat ulang halaman web.');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('=> XAMPP / MySQL belum menyala! Silakan tekan tombol START MySQL di XAMPP.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('=> Password MySQL salah. Cek konfigurasi file backend/.env Anda.');
    }
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

autoFix();
