const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  // Support both DB_PASSWORD and DB_PASS for backwards compatibility
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  // Support both DB_DATABASE and DB_NAME for backwards compatibility
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'db_guru_sd',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
