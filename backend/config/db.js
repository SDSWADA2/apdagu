/**
 * ============================================================================
 * KONFIGURASI DATABASE POSTGRESQL (NEON)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * File ini mengekspor:
 *   - pool          : pg pool (default export)
 *   - testDbConnection() : fungsi diagnostik koneksi
 *   - dbConfig      : objek konfigurasi yang dipakai
 */

'use strict';

const { Pool } = require('pg');
require('dotenv').config();

// ============================================================================
// Baca konfigurasi dari environment variables
// ============================================================================
const dbConfig = {
  // Jika DATABASE_URL tersedia (untuk Neon), gunakan itu
  connectionString: process.env.DATABASE_URL,
  
  // Fallback jika tidak menggunakan connectionString
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'db_guru_sd',

  // SSL dibutuhkan untuk Neon dan kebanyakan cloud DB
  ssl: {
    rejectUnauthorized: false // Izinkan sertifikat self-signed / cloud
  },

  // Pool Settings
  max: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Hapus parameter individual jika connectionString digunakan agar tidak konflik
if (dbConfig.connectionString) {
  delete dbConfig.host;
  delete dbConfig.port;
  delete dbConfig.user;
  delete dbConfig.password;
  delete dbConfig.database;
}

// ============================================================================
// Inisialisasi Connection Pool
// ============================================================================
const pool = new Pool(dbConfig);

// ============================================================================
// Helper: Uji koneksi ke database PostgreSQL saat startup / health check
// ============================================================================
async function testDbConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query("SELECT 1+1 AS test, version() AS version, current_database() AS db_name");
    const row = result.rows[0];
    return {
      connected: true,
      message:   'Koneksi database PostgreSQL berhasil.',
      version:   row?.version  || 'unknown',
      database:  row?.db_name  || 'unknown',
      host:      dbConfig.host || 'Neon Cloud',
      port:      dbConfig.port || 5432,
    };
  } catch (error) {
    return {
      connected: false,
      message:   `Gagal terhubung ke database PostgreSQL: ${error.message}`,
      error:     error.code || error.message,
      database:  dbConfig.database || 'unknown',
      host:      dbConfig.host || 'unknown',
      port:      dbConfig.port || 5432,
    };
  } finally {
    if (client) client.release();
  }
}

// ============================================================================
// Exports
// ============================================================================
module.exports                   = pool;
module.exports.testDbConnection  = testDbConnection;
module.exports.dbConfig          = dbConfig;
