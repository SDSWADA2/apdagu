-- ============================================================================
-- DATABASE SCHEMA: APDAGU Enterprise v2.0
-- (Dioptimalkan untuk Supabase Offline-First dengan UUID, Soft Delete & RLS)
-- ============================================================================

-- Ekstensi untuk UUID agar di-generate secara native oleh PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function untuk updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 1. TABEL PROFIL SEKOLAH (KONFIGURASI UTAMA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profil_sekolah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npsn VARCHAR(20) UNIQUE NOT NULL,
    nss VARCHAR(30),
    nama_sekolah VARCHAR(150) NOT NULL,
    status_sekolah VARCHAR(50) DEFAULT 'Negeri',
    akreditasi VARCHAR(5),
    alamat_lengkap TEXT NOT NULL,
    desa_kelurahan VARCHAR(100),
    kecamatan VARCHAR(100),
    kabupaten_kota VARCHAR(100),
    provinsi VARCHAR(100),
    kode_pos VARCHAR(10),
    lintang NUMERIC(10, 8),
    bujur NUMERIC(11, 8),
    telepon VARCHAR(30),
    email VARCHAR(100),
    website VARCHAR(100),
    nama_kepala_sekolah VARCHAR(150),
    nip_kepala_sekolah VARCHAR(30),
    logo_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_profil_sekolah_modtime
    BEFORE UPDATE ON profil_sekolah
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 2. TABEL PENGATURAN APLIKASI
-- ============================================================================
CREATE TABLE IF NOT EXISTS pengaturan_aplikasi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kunci VARCHAR(100) UNIQUE NOT NULL,
    nilai TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_pengaturan_aplikasi_modtime
    BEFORE UPDATE ON pengaturan_aplikasi
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 3. TABEL GURU DAN TENAGA KEPENDIDIKAN (PTK)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nuptk VARCHAR(20) UNIQUE,
    nip VARCHAR(30) UNIQUE,
    nama_lengkap VARCHAR(150) NOT NULL,
    gelar_depan VARCHAR(20),
    gelar_belakang VARCHAR(20),
    jenis_kelamin VARCHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    agama VARCHAR(30),
    nik VARCHAR(20) UNIQUE,
    alamat TEXT,
    rt_rw VARCHAR(10),
    dusun VARCHAR(100),
    desa_kelurahan VARCHAR(100),
    kecamatan VARCHAR(100),
    kabupaten_kota VARCHAR(100),
    provinsi VARCHAR(100),
    kode_pos VARCHAR(10),
    telepon VARCHAR(30),
    email VARCHAR(100),
    status_perkawinan VARCHAR(30),
    nama_pasangan VARCHAR(150),
    pekerjaan_pasangan VARCHAR(100),
    nama_ibu_kandung VARCHAR(150) NOT NULL,
    npwp VARCHAR(30),
    bank_nama VARCHAR(50),
    bank_rekening VARCHAR(50),
    bank_atas_nama VARCHAR(150),
    status_keaktifan VARCHAR(30) DEFAULT 'Aktif' CHECK (status_keaktifan IN ('Aktif', 'Cuti', 'Pensiun', 'Mutasi', 'Resign', 'Meninggal')),
    foto_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_guru_modtime
    BEFORE UPDATE ON guru
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 4. TABEL AUTENTIKASI PROFILES (Integrasi dengan auth.users Supabase)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    nama_lengkap VARCHAR(150),
    role VARCHAR(30) DEFAULT 'guru' CHECK (role IN ('admin', 'operator', 'guru')),
    guru_id UUID REFERENCES public.guru(id) ON DELETE SET NULL,
    foto_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 5. TABEL RIWAYAT KEPEGAWAIAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS kepegawaian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    status_kepegawaian VARCHAR(50) NOT NULL CHECK (status_kepegawaian IN ('PNS', 'PPPK', 'GTY/PTY', 'Guru Honor Sekolah', 'Guru Honor Pemda')),
    jenis_ptk VARCHAR(50) NOT NULL CHECK (jenis_ptk IN ('Guru Kelas', 'Guru Mapel', 'Kepala Sekolah', 'Tenaga Administrasi', 'Penjaga Sekolah')),
    sk_pengangkatan VARCHAR(100),
    tmt_pengangkatan DATE,
    lembaga_pengangkat VARCHAR(100),
    sk_cpns VARCHAR(100),
    tmt_cpns DATE,
    sk_pns VARCHAR(100),
    tmt_pns DATE,
    golongan VARCHAR(20),
    sumber_gaji VARCHAR(100),
    unit_kerja VARCHAR(150) DEFAULT 'SD Negeri Sumber Waru 2',
    gaji_pokok NUMERIC(15, 2) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_kepegawaian_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_kepegawaian_modtime
    BEFORE UPDATE ON kepegawaian
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 6. TABEL RIWAYAT PENDIDIKAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS pendidikan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    jenjang VARCHAR(20) NOT NULL CHECK (jenjang IN ('SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3')),
    nama_institusi VARCHAR(150) NOT NULL,
    fakultas VARCHAR(100),
    program_studi VARCHAR(100) NOT NULL,
    tahun_masuk INT NOT NULL,
    tahun_lulus INT NOT NULL,
    ipk NUMERIC(4, 2),
    nomor_ijazah VARCHAR(100),
    file_ijazah_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_pendidikan_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_pendidikan_modtime
    BEFORE UPDATE ON pendidikan
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 7. TABEL SERTIFIKASI GURU (PPG / SERTIFIKAT PENDIDIK)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sertifikasi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    nomor_sertifikat VARCHAR(100) NOT NULL,
    bidang_studi VARCHAR(100) NOT NULL,
    tahun_sertifikasi INT NOT NULL,
    lptk_penyelenggara VARCHAR(150) NOT NULL,
    nomor_registrasi_guru VARCHAR(100),
    nomor_peserta VARCHAR(100),
    status_berlaku VARCHAR(30) DEFAULT 'Aktif' CHECK (status_berlaku IN ('Aktif', 'Non-Aktif', 'Dalam Proses')),
    file_sertifikat_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_sertifikasi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_sertifikasi_modtime
    BEFORE UPDATE ON sertifikasi
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 8. TABEL JADWAL MENGAJAR (KURIKULUM MERDEKA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS jadwal_mengajar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    tahun_ajaran VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil' CHECK (semester IN ('Ganjil', 'Genap')),
    hari VARCHAR(20) NOT NULL CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    jam_ke VARCHAR(20) NOT NULL,
    waktu_mulai TIME NOT NULL,
    waktu_selesai TIME NOT NULL,
    kelas VARCHAR(30) NOT NULL,
    mata_pelajaran VARCHAR(100) NOT NULL,
    ruangan VARCHAR(50) DEFAULT 'Ruang Kelas',
    jumlah_jp INT NOT NULL DEFAULT 2,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_jadwal_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_jadwal_mengajar_modtime
    BEFORE UPDATE ON jadwal_mengajar
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 9. TABEL BEBAN MENGAJAR & TUGAS TAMBAHAN (VALIDASI 24 JP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS beban_mengajar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    tahun_ajaran VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
    jp_tatap_muka INT NOT NULL DEFAULT 0,
    tugas_tambahan VARCHAR(100),
    jp_tugas_tambahan INT NOT NULL DEFAULT 0,
    ekstrakurikuler VARCHAR(100),
    jp_ekskul INT NOT NULL DEFAULT 0,
    total_jp INT GENERATED ALWAYS AS (jp_tatap_muka + jp_tugas_tambahan + jp_ekskul) STORED,
    status_pemenuhan VARCHAR(30) DEFAULT 'Terpenuhi' CHECK (status_pemenuhan IN ('Terpenuhi', 'Belum Terpenuhi')),
    keterangan TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_beban_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_beban_mengajar_modtime
    BEFORE UPDATE ON beban_mengajar
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 10. TABEL ABSENSI GURU (PRESENSI HARIAN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    tanggal DATE NOT NULL,
    waktu_masuk TIME,
    waktu_pulang TIME,
    status_kehadiran VARCHAR(30) NOT NULL CHECK (status_kehadiran IN ('Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Cuti', 'Alpha')),
    keterangan TEXT,
    lampiran_url TEXT,
    lokasi_gps VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_absensi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE,
    CONSTRAINT uq_guru_tanggal UNIQUE (guru_id, tanggal)
);

CREATE TRIGGER update_absensi_modtime
    BEFORE UPDATE ON absensi
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 11. TABEL PENILAIAN KINERJA GURU (PKG / SKP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pkg (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    tahun_penilaian INT NOT NULL,
    periode VARCHAR(30) DEFAULT 'Tahunan',
    skor_perencanaan NUMERIC(5, 2) NOT NULL,
    skor_pelaksanaan NUMERIC(5, 2) NOT NULL,
    skor_evaluasi NUMERIC(5, 2) NOT NULL,
    skor_profesionalisme NUMERIC(5, 2) NOT NULL,
    skor_kehadiran NUMERIC(5, 2) NOT NULL,
    nilai_akhir NUMERIC(5, 2) NOT NULL,
    predikat VARCHAR(30) NOT NULL CHECK (predikat IN ('Amat Baik', 'Baik', 'Cukup', 'Sedang', 'Kurang')),
    nama_penilai VARCHAR(150) NOT NULL,
    nip_penilai VARCHAR(30),
    catatan_rekomendasi TEXT,
    file_laporan_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_pkg_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_pkg_modtime
    BEFORE UPDATE ON pkg
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 12. TABEL PRESTASI GURU & SISWA BINAAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS prestasi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Guru Berprestasi' CHECK (kategori IN ('Guru Berprestasi', 'Pembimbing Siswa', 'Karya Inovasi', 'Penghargaan Dedikasi')),
    nama_prestasi VARCHAR(200) NOT NULL,
    tingkat VARCHAR(50) NOT NULL CHECK (tingkat IN ('Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional')),
    peringkat_juara VARCHAR(50) NOT NULL,
    tahun INT NOT NULL,
    penyelenggara VARCHAR(150) NOT NULL,
    nomor_piagam VARCHAR(100),
    file_piagam_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_prestasi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_prestasi_modtime
    BEFORE UPDATE ON prestasi
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 13. TABEL PELATIHAN & PENGEMBANGAN DIRI (PMM / DIKLAT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pelatihan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    nama_pelatihan VARCHAR(200) NOT NULL,
    jenis_pelatihan VARCHAR(100) DEFAULT 'Pelatihan Mandiri PMM' CHECK (jenis_pelatihan IN ('Pelatihan Mandiri PMM', 'Diklat Fungsional', 'Workshop / Bimtek', 'Seminar / Webinar', 'Guru Penggerak')),
    penyelenggara VARCHAR(150) NOT NULL,
    pola_jp INT NOT NULL DEFAULT 32,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    tahun INT NOT NULL,
    nomor_sertifikat VARCHAR(100),
    file_sertifikat_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_pelatihan_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_pelatihan_modtime
    BEFORE UPDATE ON pelatihan
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 14. TABEL DOKUMEN DIGITAL (E-ARSIP GURU)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dokumen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL,
    kategori_dokumen VARCHAR(50) NOT NULL CHECK (kategori_dokumen IN ('KTP', 'KK', 'NPWP', 'Ijazah', 'Transkrip', 'SK Kepegawaian', 'Sertifikat Pendidik', 'Pakta Integritas', 'SK Pembagian Tugas', 'Dokumen Lainnya')),
    nama_dokumen VARCHAR(200) NOT NULL,
    nomor_dokumen VARCHAR(100),
    tanggal_terbit DATE,
    tanggal_kadaluarsa DATE,
    file_url TEXT NOT NULL,
    ukuran_file_kb INT,
    keterangan TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_dokumen_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

CREATE TRIGGER update_dokumen_modtime
    BEFORE UPDATE ON dokumen
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 15. TABEL AUDIT LOG AKTIVITAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    username VARCHAR(100) NOT NULL,
    aksi VARCHAR(50) NOT NULL,
    tabel_terkait VARCHAR(50) NOT NULL,
    deskripsi TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_audit_logs_modtime
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- INDEXES UNTUK OPTIMASI PERFORMA PENCARIAN SUPER CEPAT
-- ============================================================================
CREATE INDEX idx_guru_nama ON guru(nama_lengkap);
CREATE INDEX idx_guru_nuptk ON guru(nuptk);
CREATE INDEX idx_guru_nip ON guru(nip);
CREATE INDEX idx_guru_status ON guru(status_keaktifan);
CREATE INDEX idx_kepegawaian_status ON kepegawaian(status_kepegawaian);
CREATE INDEX idx_absensi_tanggal ON absensi(tanggal);
CREATE INDEX idx_absensi_guru_tgl ON absensi(guru_id, tanggal);
CREATE INDEX idx_jadwal_hari_kelas ON jadwal_mengajar(hari, kelas);
CREATE INDEX idx_dokumen_kategori ON dokumen(kategori_dokumen);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- RLS (Row Level Security) - Supabase Security Best Practices
-- ============================================================================
-- Mengaktifkan RLS di semua tabel
ALTER TABLE profil_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaturan_aplikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kepegawaian ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendidikan ENABLE ROW LEVEL SECURITY;
ALTER TABLE sertifikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE beban_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pkg ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelatihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan default: izinkan semua operasi bagi pengguna yang terautentikasi 
-- (Anda dapat menyesuaikan ini lebih spesifik per role nanti)
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON profil_sekolah FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON pengaturan_aplikasi FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON guru FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON kepegawaian FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON pendidikan FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON sertifikasi FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON jadwal_mengajar FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON beban_mengajar FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON absensi FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON pkg FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON prestasi FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON pelatihan FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON dokumen FOR ALL TO authenticated USING (true);
CREATE POLICY "Izinkan semua bagi pengguna terautentikasi" ON audit_logs FOR ALL TO authenticated USING (true);

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- ============================================================================
-- Memastikan semua tabel master dan transaksi masuk dalam publication supabase_realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    profil_sekolah,
    pengaturan_aplikasi,
    guru,
    public.profiles,
    kepegawaian,
    pendidikan,
    sertifikasi,
    jadwal_mengajar,
    beban_mengajar,
    absensi,
    pkg,
    prestasi,
    pelatihan,
    dokumen,
    audit_logs;
COMMIT;
