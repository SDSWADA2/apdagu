/**
 * ============================================================================
 * KNEXFILE — Konfigurasi Migrations & Seeds
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * Digunakan oleh perintah:
 *   npm run migrate          → npx knex migrate:latest
 *   npm run migrate:rollback → npx knex migrate:rollback
 *   npm run seed             → npx knex seed:run
 * ============================================================================
 */

'use strict';

require('dotenv').config();

// Baca konfigurasi dari environment (sama dengan config/db.js)
const connection = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT, 10) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '',
  database: process.env.DB_NAME     || process.env.DB_DATABASE || 'db_guru_sd',
  charset:  'utf8mb4',
  timezone: '+07:00',
  multipleStatements: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

module.exports = {
  // ─── Development ─────────────────────────────────────────────────────────
  development: {
    client: 'mysql2',
    connection,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory:  './migrations',
      tableName:  'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  // ─── Test ─────────────────────────────────────────────────────────────────
  test: {
    client: 'mysql2',
    connection: {
      ...connection,
      database: process.env.DB_TEST_NAME || 'db_guru_sd_test',
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory:  './migrations',
      tableName:  'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  // ─── Production ───────────────────────────────────────────────────────────
  production: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT, 10) || 3306,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD ?? process.env.DB_PASS,
      database: process.env.DB_NAME || process.env.DB_DATABASE,
      charset:  'utf8mb4',
      timezone: '+07:00',
      multipleStatements: true,
      ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory:  './migrations',
      tableName:  'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};
