/**
 * ============================================================================
 * KONFIGURASI DATABASE MYSQL / MARIADB
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.DB_PASS || ''),
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'db_guru_sd',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4',
  timezone: '+07:00',
  multipleStatements: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Inisialisasi pool koneksi
const pool = mysql.createPool(dbConfig);

/**
 * Helper untuk menguji koneksi ke database MySQL
 * @returns {Promise<{connected: boolean, message: string, details?: any}>}
 */
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS test, VERSION() AS version');
    connection.release();
    return {
      connected: true,
      message: 'Koneksi database berhasil.',
      version: rows[0]?.version || 'unknown',
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port
    };
  } catch (error) {
    return {
      connected: false,
      message: `Gagal terhubung ke database: ${error.message}`,
      error: error.code || error.message,
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port
    };
  }
}

module.exports = pool;
module.exports.testDbConnection = testDbConnection;
module.exports.dbConfig = dbConfig;
