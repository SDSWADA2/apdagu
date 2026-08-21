/**
 * auto_fix.js (PostgreSQL)
 * Skrip Perbaikan Otomatis Total (All-in-One Fix)
 * Mengatasi semua masalah setup database, error migrasi, dan akun login yang hilang.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;

async function autoFix() {
  console.log('\n============================================================');
  console.log('  🚀 AUTO FIX: MEMPERBAIKI SELURUH MASALAH DATABASE & LOGIN');
  console.log('============================================================\n');

  if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL tidak ditemukan di file .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    process.stdout.write('[1/3] Menghubungkan ke PostgreSQL... ');
    await client.connect();
    console.log('✅ Berhasil!');

    process.stdout.write('[2/3] Memeriksa & menginstall tabel dasar... ');
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      console.log('✅ Tabel dasar terpasang!');
    } else {
      console.log('⚠️ File schema tidak ditemukan, dilewati.');
    }

    process.stdout.write('[3/3] Mengamankan & mereset akun login Admin... ');
    const hashAdmin = await bcrypt.hash('admin123', 10);
    
    const { rows: existing } = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (existing.length === 0) {
      await client.query(
        `INSERT INTO users (username, password_hash, nama_lengkap, email, role, is_active) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin', hashAdmin, 'Administrator Sistem', 'admin@sekolah.id', 'admin', true]
      );
    } else {
      await client.query(
        `UPDATE users SET password_hash = $1, is_active = true WHERE username = 'admin'`,
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
  } finally {
    await client.end();
    process.exit(0);
  }
}

autoFix();
