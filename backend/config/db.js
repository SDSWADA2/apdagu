/**
 * ============================================================================
 * KONFIGURASI DATABASE MYSQL / MARIADB
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * File ini mengekspor:
 *   - pool          : mysql2/promise pool (default export)
 *   - testDbConnection() : fungsi diagnostik koneksi
 *   - dbConfig      : objek konfigurasi yang dipakai
 */

'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================================================
// Baca konfigurasi dari environment variables dengan nilai fallback yang aman
// ============================================================================
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT, 10) || 3306,
  user:     process.env.DB_USER     || 'root',
  // Dukung DB_PASSWORD (baru) dan DB_PASS (lama) untuk kompatibilitas mundur
  password: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '',
  // Dukung DB_NAME (baru) dan DB_DATABASE (lama) untuk kompatibilitas mundur
  database: process.env.DB_NAME     || process.env.DB_DATABASE || 'db_guru_sd',

  // ─── Pool Settings ─────────────────────────────────────────────────────────
  waitForConnections: true,
  connectionLimit:    parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit:         0,          // Antre tanpa batas

  // ─── Koneksi Keepalive ─────────────────────────────────────────────────────
  enableKeepAlive:     true,
  keepAliveInitialDelay: 10_000,  // 10 detik

  // ─── Encoding & Timezone ───────────────────────────────────────────────────
  charset:  'utf8mb4',
  timezone: '+07:00',             // WIB (Waktu Indonesia Barat)

  // ─── Statement ─────────────────────────────────────────────────────────────
  multipleStatements: true,       // Diperlukan saat menjalankan skrip migrasi SQL

  // ─── SSL (aktifkan untuk koneksi ke Cloud MySQL / PlanetScale / Aiven) ─────
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// ============================================================================
// Inisialisasi Connection Pool
// ============================================================================
const pool = mysql.createPool(dbConfig);

// ============================================================================
// Helper: Uji koneksi ke database MySQL saat startup / health check
// ============================================================================
/**
 * @returns {Promise<{
 *   connected: boolean,
 *   message: string,
 *   version?: string,
 *   database?: string,
 *   host?: string,
 *   port?: number,
 *   error?: string
 * }>}
 */
async function testDbConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT 1+1 AS test, VERSION() AS version, DATABASE() AS db_name"
    );
    const row = rows[0];
    return {
      connected: true,
      message:   'Koneksi database berhasil.',
      version:   row?.version  || 'unknown',
      database:  row?.db_name  || dbConfig.database,
      host:      dbConfig.host,
      port:      dbConfig.port,
    };
  } catch (error) {
    return {
      connected: false,
      message:   `Gagal terhubung ke database: ${error.message}`,
      error:     error.code || error.message,
      database:  dbConfig.database,
      host:      dbConfig.host,
      port:      dbConfig.port,
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// Exports
// ============================================================================
module.exports                   = pool;
module.exports.testDbConnection  = testDbConnection;
module.exports.dbConfig          = dbConfig;
