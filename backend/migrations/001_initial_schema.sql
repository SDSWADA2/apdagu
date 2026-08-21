-- ============================================================================
-- SKEMA LENGKAP DATABASE: APLIKASI DATABASE GURU SD NEGERI SUMBER WARU 2
-- Standar Kurikulum Merdeka & Dapodik Kemendikbudristek (MySQL / MariaDB)
-- ============================================================================

-- 1. TABEL PROFIL SEKOLAH
CREATE TABLE IF NOT EXISTS profil_sekolah (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL USERS & OTENTIKASI
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'guru',
    guru_id INT NULL,
    foto_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL UTAMA GURU (MASTER DATA)
CREATE TABLE IF NOT EXISTS guru (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nuptk VARCHAR(30) UNIQUE,
    nip VARCHAR(30) UNIQUE,
    nama_lengkap VARCHAR(150) NOT NULL,
    gelar_depan VARCHAR(50),
    gelar_belakang VARCHAR(50),
    jenis_kelamin VARCHAR(20) NOT NULL DEFAULT 'Laki-laki',
    tempat_lahir VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    agama VARCHAR(30) NOT NULL DEFAULT 'Islam',
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
    status_keaktifan VARCHAR(30) DEFAULT 'Aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL KEPEGAWAIAN GURU
CREATE TABLE IF NOT EXISTS kepegawaian (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    status_kepegawaian VARCHAR(50) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    pangkat_golongan VARCHAR(50),
    tmt_pengangkatan DATE NOT NULL,
    sk_pengangkatan VARCHAR(100),
    nomor_sk VARCHAR(100),
    tanggal_sk DATE,
    pejabat_pengangkat VARCHAR(150),
    instansi VARCHAR(150) DEFAULT 'Dinas Pendidikan',
    unit_kerja VARCHAR(150) DEFAULT 'SD Negeri Sumber Waru 2',
    gaji_pokok DECIMAL(15, 2) DEFAULT 0,
    tunjangan DECIMAL(15, 2) DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_kepegawaian_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL RIWAYAT PENDIDIKAN
CREATE TABLE IF NOT EXISTS pendidikan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    jenjang VARCHAR(20) NOT NULL,
    nama_institusi VARCHAR(150) NOT NULL,
    fakultas VARCHAR(100),
    program_studi VARCHAR(100) NOT NULL,
    tahun_masuk INT NOT NULL,
    tahun_lulus INT NOT NULL,
    ipk DECIMAL(4, 2),
    nomor_ijazah VARCHAR(100),
    file_ijazah_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pendidikan_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL SERTIFIKASI GURU (PPG / SERTIFIKAT PENDIDIK)
CREATE TABLE IF NOT EXISTS sertifikasi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    nomor_sertifikat VARCHAR(100) NOT NULL,
    bidang_studi VARCHAR(100) NOT NULL,
    tahun_sertifikasi INT NOT NULL,
    lptk_penyelenggara VARCHAR(150) NOT NULL,
    nomor_registrasi_guru VARCHAR(100),
    nomor_peserta VARCHAR(100),
    status_berlaku VARCHAR(30) DEFAULT 'Aktif',
    file_sertifikat_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sertifikasi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL JADWAL MENGAJAR (KURIKULUM MERDEKA)
CREATE TABLE IF NOT EXISTS jadwal_mengajar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    tahun_ajaran VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
    hari VARCHAR(20) NOT NULL,
    jam_ke VARCHAR(20) NOT NULL,
    waktu_mulai TIME NOT NULL,
    waktu_selesai TIME NOT NULL,
    kelas VARCHAR(30) NOT NULL,
    mata_pelajaran VARCHAR(100) NOT NULL,
    ruangan VARCHAR(50) DEFAULT 'Ruang Kelas',
    jumlah_jp INT NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_jadwal_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL BEBAN MENGAJAR & TUGAS TAMBAHAN (VALIDASI 24 JP)
CREATE TABLE IF NOT EXISTS beban_mengajar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    tahun_ajaran VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
    jp_tatap_muka INT NOT NULL DEFAULT 0,
    tugas_tambahan VARCHAR(100),
    jp_tugas_tambahan INT NOT NULL DEFAULT 0,
    ekstrakurikuler VARCHAR(100),
    jp_ekskul INT NOT NULL DEFAULT 0,
    total_jp INT NOT NULL DEFAULT 0,
    status_pemenuhan VARCHAR(30) DEFAULT 'Terpenuhi',
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_beban_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL ABSENSI GURU (PRESENSI HARIAN)
CREATE TABLE IF NOT EXISTS absensi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    tanggal DATE NOT NULL,
    waktu_masuk TIME NULL,
    waktu_pulang TIME NULL,
    status_kehadiran VARCHAR(30) NOT NULL DEFAULT 'Hadir',
    keterangan TEXT,
    lampiran_url TEXT,
    lokasi_gps VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_absensi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE,
    UNIQUE KEY uq_guru_tanggal (guru_id, tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL PENILAIAN KINERJA GURU (PKG / SKP)
CREATE TABLE IF NOT EXISTS pkg (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    tahun_penilaian INT NOT NULL,
    periode VARCHAR(30) DEFAULT 'Tahunan',
    skor_perencanaan DECIMAL(5, 2) NOT NULL DEFAULT 0,
    skor_pelaksanaan DECIMAL(5, 2) NOT NULL DEFAULT 0,
    skor_evaluasi DECIMAL(5, 2) NOT NULL DEFAULT 0,
    skor_profesionalisme DECIMAL(5, 2) NOT NULL DEFAULT 0,
    skor_kehadiran DECIMAL(5, 2) NOT NULL DEFAULT 0,
    nilai_akhir DECIMAL(5, 2) NOT NULL DEFAULT 0,
    predikat VARCHAR(30) NOT NULL DEFAULT 'Baik',
    nama_penilai VARCHAR(150) NOT NULL,
    nip_penilai VARCHAR(30),
    catatan_rekomendasi TEXT,
    file_laporan_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pkg_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL PRESTASI GURU & SISWA BINAAN
CREATE TABLE IF NOT EXISTS prestasi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Guru Berprestasi',
    nama_prestasi VARCHAR(200) NOT NULL,
    tingkat VARCHAR(50) NOT NULL DEFAULT 'Kabupaten',
    peringkat_juara VARCHAR(50) NOT NULL,
    tahun INT NOT NULL,
    penyelenggara VARCHAR(150) NOT NULL,
    nomor_piagam VARCHAR(100),
    file_piagam_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prestasi_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL PELATIHAN & PENGEMBANGAN DIRI (PMM / DIKLAT)
CREATE TABLE IF NOT EXISTS pelatihan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    nama_pelatihan VARCHAR(200) NOT NULL,
    jenis_pelatihan VARCHAR(100) DEFAULT 'Pelatihan Mandiri PMM',
    penyelenggara VARCHAR(150) NOT NULL,
    pola_jp INT NOT NULL DEFAULT 32,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    tahun INT NOT NULL,
    nomor_sertifikat VARCHAR(100),
    file_sertifikat_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pelatihan_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABEL DOKUMEN DIGITAL (E-ARSIP GURU)
CREATE TABLE IF NOT EXISTS dokumen (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guru_id INT NOT NULL,
    kategori_dokumen VARCHAR(50) NOT NULL,
    nama_dokumen VARCHAR(200) NOT NULL,
    nomor_dokumen VARCHAR(100),
    tanggal_terbit DATE,
    tanggal_kadaluarsa DATE,
    file_url TEXT NOT NULL,
    ukuran_file_kb INT DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dokumen_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TABEL AUDIT LOG AKTIVITAS
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    username VARCHAR(100) NOT NULL DEFAULT 'Sistem',
    aksi VARCHAR(50) NOT NULL,
    tabel_terkait VARCHAR(50) NOT NULL,
    deskripsi TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. TABEL PENGATURAN APLIKASI
CREATE TABLE IF NOT EXISTS pengaturan_aplikasi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

