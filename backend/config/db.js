/**
 * ============================================================================
 * KONFIGURASI DATABASE: SUPABASE (PostgreSQL)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * Supabase menggunakan PostgreSQL standar — semua query SQL yang ada
 * tetap berjalan tanpa perubahan apapun.
 *
 * Exports:
 *   - pool                : pg Pool (default export) — untuk semua raw SQL
 *   - supabaseAdmin       : Supabase JS Client (server-side, service role)
 *   - testDbConnection()  : fungsi diagnostik koneksi
 */

'use strict';

const { Pool }              = require('pg');
const { createClient }      = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================================================
// 1. SUPABASE JS CLIENT — untuk fitur Supabase (Realtime, Storage, Auth RPC)
// ============================================================================
const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken : false,
      persistSession   : false,
    },
    db: {
      schema: 'public',
    },
  });
  console.log('[DB] Supabase Admin Client berhasil diinisialisasi.');
} else {
  console.warn('[DB] Supabase Admin Client tidak diinisialisasi — SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset.');
}

// ============================================================================
// 2. PG POOL — untuk semua raw SQL queries (tetap performa tinggi)
// ============================================================================
const isPoolerUrl = process.env.DATABASE_URL?.includes('pooler.supabase.com');

const dbConfig = {
  connectionString : process.env.DATABASE_URL,
  ssl              : { rejectUnauthorized: false },

  // Pengaturan pool optimal untuk Supabase Free Tier (max 20 connections)
  // Supabase Pooler (Transaction Mode) recommended max: 20
  max                    : parseInt(process.env.DB_CONNECTION_LIMIT, 10) || (isPoolerUrl ? 20 : 10),
  idleTimeoutMillis      : 30000,
  connectionTimeoutMillis: 5000,   // Supabase perlu waktu sedikit lebih lama saat cold start
  allowExitOnIdle        : false,
};

const pool = new Pool(dbConfig);

// Event listener untuk deteksi error koneksi
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client:', err.message);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] Koneksi baru ke Supabase PostgreSQL dibuat.');
  }
});

// ============================================================================
// 3. HELPER: Uji koneksi ke Supabase saat startup / health check
// ============================================================================
async function testDbConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT 1+1 AS test, version() AS version, current_database() AS db_name, NOW() AS server_time"
    );
    const row = result.rows[0];

    // Test Supabase Client jika tersedia
    let supabaseStatus = 'not_configured';
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('profil_sekolah').select('id').limit(1);
        supabaseStatus = error ? `error: ${error.message}` : 'connected';
      } catch {
        supabaseStatus = 'client_error';
      }
    }

    return {
      connected       : true,
      message         : 'Koneksi ke Supabase PostgreSQL berhasil.',
      version         : row?.version   || 'unknown',
      database        : row?.db_name   || 'unknown',
      server_time     : row?.server_time,
      host            : 'Supabase Cloud (ap-southeast-1)',
      port            : 5432,
      supabase_client : supabaseStatus,
      pool_mode       : isPoolerUrl ? 'Transaction Pooler' : 'Direct',
    };
  } catch (error) {
    return {
      connected : false,
      message   : `Gagal terhubung ke Supabase: ${error.message}`,
      error     : error.code || error.message,
      hint      : 'Periksa DATABASE_URL di .env — pastikan password database sudah diisi dari Supabase Dashboard > Settings > Database',
    };
  } finally {
    if (client) client.release();
  }
}

// ============================================================================
// 4. EXPORTS
// ============================================================================
module.exports                  = pool;
module.exports.pool             = pool;
module.exports.supabaseAdmin    = supabaseAdmin;
module.exports.testDbConnection = testDbConnection;
module.exports.dbConfig         = dbConfig;
