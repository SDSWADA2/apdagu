/**
 * Menjalankan migrasi 002: Sync Improvements
 * Jalankan: node backend/scripts/run_migration_002.js
 */
'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL tidak ditemukan di .env');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Terhubung ke PostgreSQL.');

    const sqlFile = path.join(__dirname, '../migrations/002_sync_improvements.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Jalankan per-statement agar error lebih jelas
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        console.log(`  ✅ OK: ${stmt.substring(0, 80).replace(/\n/g, ' ')}...`);
      } catch (err) {
        // IF EXISTS / DO NOTHING errors boleh diabaikan
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          console.log(`  ℹ️  Skip (sudah ada): ${stmt.substring(0, 60).replace(/\n/g, ' ')}`);
        } else {
          console.error(`  ❌ Error: ${err.message}`);
        }
      }
    }

    console.log('\n🎉 Migrasi 002 selesai!');
  } catch (err) {
    console.error('❌ Error koneksi:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
