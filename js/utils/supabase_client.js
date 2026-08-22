/**
 * ============================================================================
 * SUPABASE CLIENT — Frontend Integration
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 *
 * File ini menginisialisasi Supabase JS Client untuk:
 *   1. Realtime Subscriptions (pengganti/pelengkap Socket.IO)
 *   2. Direct API calls jika diperlukan
 *
 * CARA PAKAI di module lain:
 *   import { supabase, SupabaseRealtime } from './utils/supabase_client.js';
 *
 * PENTING: File ini menggunakan ANON KEY (aman untuk client-side).
 *          Semua operasi tulis tetap melalui backend API (JWT protected).
 * ============================================================================
 */

// ============================================================================
// KONFIGURASI SUPABASE
// ============================================================================
const SUPABASE_CONFIG = {
  url    : 'https://cjijssmdrmzufacisrjn.supabase.co',
  anonKey: 'sb_publishable_Z7mmjmgqmYcOBpjlD9IKZA_JNj8D5HD',
};

// ============================================================================
// INISIALISASI CLIENT
// Menggunakan CDN Supabase v2 via ES Module dari unpkg/jsdelivr
// ============================================================================
let supabase = null;
let _initPromise = null;

async function getSupabaseClient() {
  if (supabase) return supabase;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      // Import Supabase dari CDN
      const { createClient } = await import(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
      );
      supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        realtime: {
          params: { eventsPerSecond: 10 },
        },
        auth: {
          persistSession : false, // Kita pakai JWT sendiri, bukan Supabase Auth
          autoRefreshToken: false,
        },
      });
      console.log('[Supabase] Client berhasil diinisialisasi.');
      return supabase;
    } catch (err) {
      console.warn('[Supabase] Gagal load client dari CDN:', err.message);
      return null;
    }
  })();

  return _initPromise;
}

// ============================================================================
// SUPABASE REALTIME MANAGER
// Mengelola semua subscription ke Postgres Changes
// ============================================================================
class SupabaseRealtimeManager {
  constructor() {
    this._channels   = new Map();  // channelName -> channel instance
    this._handlers   = new Map();  // eventKey    -> Set of handlers
    this._connected  = false;
    this._client     = null;
  }

  /**
   * Inisialisasi dan mulai subscribe ke semua tabel penting
   * @param {Function} onChangeCallback - dipanggil saat ada perubahan data
   */
  async init(onChangeCallback) {
    this._client = await getSupabaseClient();
    if (!this._client) {
      console.warn('[SupabaseRealtime] Client tidak tersedia, Realtime tidak aktif.');
      return false;
    }

    // Daftar tabel yang di-subscribe untuk Realtime
    const tables = [
      'guru', 'kepegawaian', 'pendidikan', 'sertifikasi',
      'jadwal_mengajar', 'beban_mengajar', 'absensi',
      'pkg', 'prestasi', 'pelatihan', 'dokumen',
      'profil_sekolah', 'users',
    ];

    // Subscribe satu channel per tabel agar efisien
    for (const table of tables) {
      this._subscribeTable(table, onChangeCallback);
    }

    this._connected = true;
    console.log(`[SupabaseRealtime] Subscribe ke ${tables.length} tabel aktif.`);
    return true;
  }

  /**
   * Subscribe ke perubahan satu tabel
   */
  _subscribeTable(tableName, callback) {
    if (this._channels.has(tableName)) return; // Sudah subscribe

    const channel = this._client
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          this._handleChange(tableName, payload, callback);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`[SupabaseRealtime] ✓ ${tableName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[SupabaseRealtime] Error di channel ${tableName}, mencoba reconnect...`);
          setTimeout(() => this._resubscribeTable(tableName, callback), 3000);
        }
      });

    this._channels.set(tableName, channel);
  }

  /**
   * Konversi payload Supabase ke format event yang seragam dengan Socket.IO
   */
  _handleChange(tableName, payload, callback) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    let action, data;
    switch (eventType) {
      case 'INSERT':
        action = 'insert';
        data   = { ...newRecord, _action: 'insert' };
        break;
      case 'UPDATE':
        action = 'update';
        data   = { ...newRecord, _action: 'update', _before: oldRecord };
        break;
      case 'DELETE':
        action = 'delete';
        data   = { id: oldRecord?.id, _action: 'delete' };
        break;
      default:
        return;
    }

    const event = {
      source : 'supabase_realtime',
      entity : tableName,
      action,
      data,
      at     : new Date().toISOString(),
    };

    // console.log(`[SupabaseRealtime] ${eventType} on ${tableName}:`, data?.id);

    if (typeof callback === 'function') {
      callback(event);
    }

    // Dispatch sebagai CustomEvent agar bisa di-listen dari mana saja
    window.dispatchEvent(new CustomEvent('supabase:change', { detail: event }));
  }

  /**
   * Resubscribe ke tabel setelah error
   */
  _resubscribeTable(tableName, callback) {
    const oldChannel = this._channels.get(tableName);
    if (oldChannel && this._client) {
      this._client.removeChannel(oldChannel);
    }
    this._channels.delete(tableName);
    this._subscribeTable(tableName, callback);
  }

  /**
   * Bersihkan semua subscription (saat logout)
   */
  async destroy() {
    if (!this._client) return;
    for (const [name, channel] of this._channels) {
      await this._client.removeChannel(channel);
      console.log(`[SupabaseRealtime] Unsubscribed dari ${name}`);
    }
    this._channels.clear();
    this._connected = false;
  }

  get isConnected() { return this._connected; }
  get tableCount()  { return this._channels.size; }
}

// Singleton instance
const SupabaseRealtime = new SupabaseRealtimeManager();

// ============================================================================
// EXPORTS
// ============================================================================
export { getSupabaseClient, SupabaseRealtime, SUPABASE_CONFIG };
export default { getSupabaseClient, SupabaseRealtime };
