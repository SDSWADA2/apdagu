-- ============================================================================
-- SKEMA DATABASE RELASIONAL: APLIKASI DATABASE GURU SD PROFESIONAL
-- SEKOLAH: SD NEGERI SUMBER WARU 2
-- STANDAR: Kurikulum Merdeka & Dapodik Kemendikbudristek
-- Engine: PostgreSQL / MySQL Compatible DDL
-- ============================================================================

-- 1. TABEL PROFIL SEKOLAH
CREATE TABLE IF NOT EXISTS profil_sekolah (
    id SERIAL PRIMARY KEY,
    npsn VARCHAR(20) NOT NULL UNIQUE,
    nss VARCHAR(30),
    nama_sekolah VARCHAR(150) NOT NULL,
    status_sekolah VARCHAR(20) DEFAULT 'Negeri',
    bentuk_pendidikan VARCHAR(30) DEFAULT 'SD',
    akreditasi VARCHAR(5) DEFAULT 'A',
    alamat_lengkap TEXT NOT NULL,
    rt_rw VARCHAR(20),
    desa_kelurahan VARCHAR(100) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL,
    kabupaten_kota VARCHAR(100) NOT NULL,
    provinsi VARCHAR(100) NOT NULL,
    kode_pos VARCHAR(10),
    telepon VARCHAR(30),
    email VARCHAR(100),
    website VARCHAR(150),
    nama_kepala_sekolah VARCHAR(150) NOT NULL,
    nip_kepala_sekolah VARCHAR(30),
    logo_url TEXT,
    stempel_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL USERS & OTENTIKASI
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'operator', 'guru')),
    guru_id INT,
    foto_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL UTAMA GURU (MASTER DATA)
CREATE TABLE IF NOT EXISTS guru (
    id SERIAL PRIMARY KEY,
    nuptk VARCHAR(30) UNIQUE,
    nip VARCHAR(30) UNIQUE,
    nama_lengkap VARCHAR(150) NOT NULL,
    gelar_depan VARCHAR(50),
    gelar_belakang VARCHAR(50),
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    agama VARCHAR(30) NOT NULL,
    status_pernikahan VARCHAR(30) DEFAULT 'Menikah',
    nik VARCHAR(30) UNIQUE,
    no_kk VARCHAR(30),
    npwp VARCHAR(30),
    alamat_jalan TEXT NOT NULL,
    rt_rw VARCHAR(20),
    desa_kelurahan VARCHAR(100) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL,
    kabupaten_kota VARCHAR(100) NOT NULL,
    provinsi VARCHAR(100) NOT NULL,
    kode_pos VARCHAR(10),
    no_hp VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    foto_url TEXT,
    tanda_tangan_url TEXT,
    qr_code_url TEXT,
    status_keaktifan VARCHAR(30) DEFAULT 'Aktif' CHECK (status_keaktifan IN ('Aktif', 'Cuti', 'Mutasi', 'Pensiun', 'Keluar')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relasi Users ke Guru (Optional)
ALTER TABLE users ADD CONSTRAINT fk_users_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE SET NULL;

-- 4. TABEL KEPEGAWAIAN GURU
CREATE TABLE IF NOT EXISTS kepegawaian (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    status_kepegawaian VARCHAR(50) NOT NULL CHECK (status_kepegawaian IN ('PNS', 'PPPK', 'Honorer Daerah', 'Honorer Sekolah (BOS)', 'GTY', 'GTT')),
    jabatan VARCHAR(100) NOT NULL,
    pangkat_golongan VARCHAR(50),
    tmt_pengangkatan DATE NOT NULL,
    sk_pengangkatan VARCHAR(100),
    nomor_sk VARCHAR(100),
    tanggal_sk DATE,
    pejabat_pengangkat VARCHAR(150),
    instansi VARCHAR(150) DEFAULT 'Dinas Pendidikan',
    unit_kerja VARCHAR(150) DEFAULT 'SD Negeri Sumber Waru 2',
    gaji_pokok NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_kepegawaian_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 5. TABEL RIWAYAT PENDIDIKAN
CREATE TABLE IF NOT EXISTS pendidikan (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    jenjang VARCHAR(20) NOT NULL CHECK (jenjang IN ('SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3')),
    nama_institusi VARCHAR(150) NOT NULL,
    fakultas VARCHAR(100),
    program_studi VARCHAR(100) NOT NULL,
    tahun_masuk INT NOT NULL,
    tahun_lulus INT NOT NULL,
    ipk NUMERIC(4, 2),
    nomor_ijazah VARCHAR(100),
    file_ijazah_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pendidikan_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 6. TABEL SERTIFIKASI GURU (PPG / SERTIFIKAT PENDIDIK)
CREATE TABLE IF NOT EXISTS sertifikasi (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    nomor_sertifikat VARCHAR(100) NOT NULL,
    bidang_studi VARCHAR(100) NOT NULL,
    tahun_sertifikasi INT NOT NULL,
    lptk_penyelenggara VARCHAR(150) NOT NULL,
    nomor_registrasi_guru VARCHAR(100),
    nomor_peserta VARCHAR(100),
    status_berlaku VARCHAR(30) DEFAULT 'Aktif' CHECK (status_berlaku IN ('Aktif', 'Non-Aktif', 'Dalam Proses')),
    file_sertifikat_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sertifikasi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 7. TABEL JADWAL MENGAJAR (KURIKULUM MERDEKA)
CREATE TABLE IF NOT EXISTS jadwal_mengajar (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_jadwal_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 8. TABEL BEBAN MENGAJAR & TUGAS TAMBAHAN (VALIDASI 24 JP)
CREATE TABLE IF NOT EXISTS beban_mengajar (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beban_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 9. TABEL ABSENSI GURU (PRESENSI HARIAN)
CREATE TABLE IF NOT EXISTS absensi (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    tanggal DATE NOT NULL,
    waktu_masuk TIME,
    waktu_pulang TIME,
    status_kehadiran VARCHAR(30) NOT NULL CHECK (status_kehadiran IN ('Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Cuti', 'Alpha')),
    keterangan TEXT,
    lampiran_url TEXT,
    lokasi_gps VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_absensi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE,
    CONSTRAINT uq_guru_tanggal UNIQUE (guru_id, tanggal)
);

-- 10. TABEL PENILAIAN KINERJA GURU (PKG / SKP)
CREATE TABLE IF NOT EXISTS pkg (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pkg_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 11. TABEL PRESTASI GURU & SISWA BINAAN
CREATE TABLE IF NOT EXISTS prestasi (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Guru Berprestasi' CHECK (kategori IN ('Guru Berprestasi', 'Pembimbing Siswa', 'Karya Inovasi', 'Penghargaan Dedikasi')),
    nama_prestasi VARCHAR(200) NOT NULL,
    tingkat VARCHAR(50) NOT NULL CHECK (tingkat IN ('Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional')),
    peringkat_juara VARCHAR(50) NOT NULL,
    tahun INT NOT NULL,
    penyelenggara VARCHAR(150) NOT NULL,
    nomor_piagam VARCHAR(100),
    file_piagam_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prestasi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 12. TABEL PELATIHAN & PENGEMBANGAN DIRI (PMM / DIKLAT)
CREATE TABLE IF NOT EXISTS pelatihan (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    nama_pelatihan VARCHAR(200) NOT NULL,
    jenis_pelatihan VARCHAR(100) DEFAULT 'Pelatihan Mandiri PMM' CHECK (jenis_pelatihan IN ('Pelatihan Mandiri PMM', 'Diklat Fungsional', 'Workshop / Bimtek', 'Seminar / Webinar', 'Guru Penggerak')),
    penyelenggara VARCHAR(150) NOT NULL,
    pola_jp INT NOT NULL DEFAULT 32,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    tahun INT NOT NULL,
    nomor_sertifikat VARCHAR(100),
    file_sertifikat_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pelatihan_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 13. TABEL DOKUMEN DIGITAL (E-ARSIP GURU)
CREATE TABLE IF NOT EXISTS dokumen (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL,
    kategori_dokumen VARCHAR(50) NOT NULL CHECK (kategori_dokumen IN ('KTP', 'KK', 'NPWP', 'Ijazah', 'Transkrip', 'SK Kepegawaian', 'Sertifikat Pendidik', 'Pakta Integritas', 'SK Pembagian Tugas', 'Dokumen Lainnya')),
    nama_dokumen VARCHAR(200) NOT NULL,
    nomor_dokumen VARCHAR(100),
    tanggal_terbit DATE,
    tanggal_kadaluarsa DATE,
    file_url TEXT NOT NULL,
    ukuran_file_kb INT,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dokumen_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
);

-- 14. TABEL AUDIT LOG AKTIVITAS
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    username VARCHAR(100) NOT NULL,
    aksi VARCHAR(50) NOT NULL,
    tabel_terkait VARCHAR(50) NOT NULL,
    deskripsi TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- SAMPLE SEED DATA AWAL: SD NEGERI SUMBER WARU 2
-- ============================================================================

INSERT INTO profil_sekolah (
    npsn, nss, nama_sekolah, status_sekolah, akreditasi, alamat_lengkap,
    desa_kelurahan, kecamatan, kabupaten_kota, provinsi, kode_pos, telepon, email,
    nama_kepala_sekolah, nip_kepala_sekolah
) VALUES (
    '20527136', '101052610041', 'SD NEGERI SUMBER WARU 2', 'Negeri', 'B',
    'ln 2, Sumber Waru 1, Sumber Waru, Kec. Waru, Kabupaten Pamekasan, Jawa Timur', 'Sumber Waru', 'Waru', 'Kabupaten Pamekasan',
    'Jawa Timur', '69353', '0819-5381-2155', 'sdnegerisumberwaru2@gmail.com',
    'FAUZAN, S.Pd.SD.', '19720602 199605 1 001'
);

INSERT INTO users (username, password_hash, nama_lengkap, email, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator Sekolah', 'admin@sdnsumberwaru2.sch.id', 'admin'),
('operator', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Operator Dapodik', 'operator@sdnsumberwaru2.sch.id', 'operator');
