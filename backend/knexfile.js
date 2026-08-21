/**
 * ============================================================================
 * KNEXFILE — Konfigurasi Migrations & Seeds (PostgreSQL)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

'use strict';

require('dotenv').config();

const connection = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

module.exports = {
  // ─── Development ─────────────────────────────────────────────────────────
  development: {
    client: 'pg',
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
    client: 'pg',
    connection,
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
    client: 'pg',
    connection,
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
