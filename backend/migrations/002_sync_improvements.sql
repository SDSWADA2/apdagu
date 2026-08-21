-- ============================================================================
-- MIGRATION 002: SYNC IMPROVEMENTS
-- Memperbaiki tabel pengaturan_aplikasi agar kompatibel dengan payload sinkronisasi
-- dan menambahkan kolom pendukung sinkronisasi yang lengkap.
-- ============================================================================

-- Ubah tabel pengaturan_aplikasi dari key-value ke struktur kolom penuh
-- (menghapus kolom lama yang tidak kompatibel dengan sistem sync)
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS logo_sekolah TEXT DEFAULT '';
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS ttd_kepala_sekolah TEXT DEFAULT '';
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS warna_utama_aplikasi VARCHAR(20) DEFAULT '#2563eb';
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS warna_tema_idcard VARCHAR(20) DEFAULT '#0f172a';

-- Kolom JSONB untuk menyimpan konfigurasi sistem, integrasi, dan absensi secara fleksibel
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS konfigurasi_sistem JSONB DEFAULT '{}';
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS integrasi JSONB DEFAULT '{}';
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS pengaturan_absensi JSONB DEFAULT '{}';

-- Buat satu baris default jika belum ada
INSERT INTO pengaturan_aplikasi (setting_key, setting_value)
VALUES ('__app_config__', 'v2')
ON CONFLICT (setting_key) DO NOTHING;

-- Tambahkan kolom updated_at jika belum ada
ALTER TABLE pengaturan_aplikasi ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Tambah kolom is_active dan kolom status yang diperlukan oleh sinkronisasi users
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
