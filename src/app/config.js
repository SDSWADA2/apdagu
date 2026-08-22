/**
 * ============================================================================
 * APDAGU ENTERPRISE v2.0 — GLOBAL APPLICATION CONFIGURATION
 * SD NEGERI SUMBER WARU 2 (KABUPATEN PAMEKASAN)
 * ============================================================================
 */

export const CONFIG = {
  APP_NAME: 'APDAGU Enterprise',
  APP_VERSION: '2.0.0',
  APP_SUBTITLE: 'Aplikasi Database Guru & PTK SD Negeri Sumber Waru 2',
  SEKOLAH: {
    NPSN: '20527136',
    NSS: '101052610041',
    NAMA: 'SD NEGERI SUMBER WARU 2',
    KECAMATAN: 'Kecamatan Waru',
    KABUPATEN: 'Kabupaten Pamekasan',
    PROVINSI: 'Jawa Timur',
    ALAMAT: 'ln 2, Sumber Waru 1, Sumber Waru, Kec. Waru, Kab. Pamekasan 69353',
    KEPALA_SEKOLAH: 'FAUZAN, S.Pd.SD.',
    NIP_KEPALA_SEKOLAH: '19720602 199605 1 001',
    LATITUDE: -6.981234,
    LONGITUDE: 113.567890,
    RADIUS_ABSEN_METER: 200,
  },
  SUPABASE: {
    URL: 'https://cjijssmdrmzufacisrjn.supabase.co',
    ANON_KEY: 'sb_publishable_Z7mmjmgqmYcOBpjlD9IKZA_JNj8D5HD',
  },
  STORAGE_BUCKETS: {
    FOTO_GURU: 'foto-guru',
    DOKUMEN: 'dokumen',
    IJAZAH: 'ijazah',
    SERTIFIKAT: 'sertifikat',
    TTD: 'ttd',
    LOGO: 'logo',
  },
  COLLECTIONS: [
    'profil_sekolah',
    'guru',
    'profiles',
    'kepegawaian',
    'pendidikan',
    'sertifikasi',
    'jadwal_mengajar',
    'beban_mengajar',
    'absensi',
    'pkg',
    'prestasi',
    'pelatihan',
    'dokumen',
    'audit_logs',
    'pengaturan_aplikasi'
  ],
  INDEXEDDB: {
    DB_NAME: 'apdagu_enterprise_v2_db',
    DB_VERSION: 1,
    MUTATION_STORE: 'pending_sync_queue',
  }
};
