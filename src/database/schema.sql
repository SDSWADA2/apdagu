-- ============================================================================
-- APDAGU ENTERPRISE v2.0 — SUPABASE POSTGRESQL NATIVE SCHEMA
-- SD NEGERI SUMBER WARU 2 (KABUPATEN PAMEKASAN)
-- ============================================================================

-- Aktifkan Ekstensi UUID & pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABEL PROFIL SEKOLAH
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profil_sekolah (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npsn                VARCHAR(20) NOT NULL UNIQUE,
    nss                 VARCHAR(30),
    nama_sekolah        VARCHAR(150) NOT NULL,
    status_sekolah      VARCHAR(20) DEFAULT 'Negeri',
    bentuk_pendidikan   VARCHAR(30) DEFAULT 'SD',
    akreditasi          VARCHAR(5) DEFAULT 'A',
    alamat_lengkap      TEXT NOT NULL,
    rt_rw               VARCHAR(20),
    desa_kelurahan      VARCHAR(100) NOT NULL,
    kecamatan           VARCHAR(100) NOT NULL,
    kabupaten_kota      VARCHAR(100) NOT NULL,
    provinsi            VARCHAR(100) NOT NULL,
    kode_pos            VARCHAR(10),
    telepon             VARCHAR(30),
    email               VARCHAR(100),
    website             VARCHAR(150),
    nama_kepala_sekolah VARCHAR(150) NOT NULL,
    nip_kepala_sekolah  VARCHAR(30),
    logo_url            TEXT,
    stempel_url         TEXT,
    created_at          TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at          TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 2. TABEL MASTER GURU
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guru (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nuptk             VARCHAR(30) UNIQUE,
    nip               VARCHAR(30) UNIQUE,
    nama_lengkap      VARCHAR(150) NOT NULL,
    gelar_depan       VARCHAR(50),
    gelar_belakang    VARCHAR(50),
    jenis_kelamin     VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tempat_lahir      VARCHAR(100) NOT NULL,
    tanggal_lahir     DATE NOT NULL,
    agama             VARCHAR(30) NOT NULL,
    status_pernikahan VARCHAR(30) DEFAULT 'Menikah',
    nik               VARCHAR(30) UNIQUE,
    no_kk             VARCHAR(30),
    npwp              VARCHAR(30),
    alamat_jalan      TEXT NOT NULL,
    rt_rw             VARCHAR(20),
    desa_kelurahan    VARCHAR(100) NOT NULL,
    kecamatan         VARCHAR(100) NOT NULL,
    kabupaten_kota    VARCHAR(100) NOT NULL,
    provinsi          VARCHAR(100) NOT NULL,
    kode_pos          VARCHAR(10),
    no_hp             VARCHAR(30) NOT NULL,
    email             VARCHAR(100),
    foto_url          TEXT,
    tanda_tangan_url  TEXT,
    qr_code_url       TEXT,
    status_keaktifan  VARCHAR(30) DEFAULT 'Aktif' CHECK (status_keaktifan IN ('Aktif', 'Cuti', 'Mutasi', 'Pensiun', 'Keluar')),
    is_deleted        BOOLEAN DEFAULT FALSE,
    created_by        TEXT,
    updated_by        TEXT,
    created_at        TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at        TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 3. TABEL PROFILES (Terhubung ke Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role         VARCHAR(30) NOT NULL DEFAULT 'guru' CHECK (role IN ('admin', 'operator', 'guru')),
    guru_id      UUID REFERENCES public.guru(id) ON DELETE SET NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    email        VARCHAR(100),
    foto_url     TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    last_login   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at   TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 4. TABEL KEPEGAWAIAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kepegawaian (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id            UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    status_kepegawaian VARCHAR(50) NOT NULL CHECK (status_kepegawaian IN ('PNS', 'PPPK', 'Honorer Daerah', 'Honorer Sekolah (BOS)', 'GTY', 'GTT')),
    jabatan            VARCHAR(100) NOT NULL,
    pangkat_golongan   VARCHAR(50),
    tmt_pengangkatan   DATE NOT NULL,
    sk_pengangkatan    VARCHAR(100),
    nomor_sk           VARCHAR(100),
    tanggal_sk         DATE,
    pejabat_pengangkat VARCHAR(150),
    instansi           VARCHAR(150) DEFAULT 'Dinas Pendidikan',
    unit_kerja         VARCHAR(150) DEFAULT 'SD Negeri Sumber Waru 2',
    gaji_pokok         NUMERIC(15, 2) DEFAULT 0,
    is_deleted         BOOLEAN DEFAULT FALSE,
    created_by         TEXT,
    updated_by         TEXT,
    created_at         TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at         TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 5. TABEL RIWAYAT PENDIDIKAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pendidikan (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id         UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    jenjang         VARCHAR(20) NOT NULL CHECK (jenjang IN ('SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3')),
    nama_institusi  VARCHAR(150) NOT NULL,
    fakultas        VARCHAR(100),
    program_studi   VARCHAR(100) NOT NULL,
    tahun_masuk     INT NOT NULL,
    tahun_lulus     INT NOT NULL,
    ipk             NUMERIC(4, 2),
    nomor_ijazah    VARCHAR(100),
    file_ijazah_url TEXT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_by      TEXT,
    updated_by      TEXT,
    created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 6. TABEL SERTIFIKASI GURU
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sertifikasi (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id               UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    nomor_sertifikat      VARCHAR(100) NOT NULL,
    bidang_studi          VARCHAR(100) NOT NULL,
    tahun_sertifikasi     INT NOT NULL,
    lptk_penyelenggara    VARCHAR(150) NOT NULL,
    nomor_registrasi_guru VARCHAR(100),
    nomor_peserta         VARCHAR(100),
    status_berlaku        VARCHAR(30) DEFAULT 'Aktif' CHECK (status_berlaku IN ('Aktif', 'Non-Aktif', 'Dalam Proses')),
    file_sertifikat_url   TEXT,
    is_deleted            BOOLEAN DEFAULT FALSE,
    created_by            TEXT,
    updated_by            TEXT,
    created_at            TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at            TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 7. TABEL JADWAL MENGAJAR
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.jadwal_mengajar (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id        UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    tahun_ajaran   VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    semester       VARCHAR(20) NOT NULL DEFAULT 'Ganjil' CHECK (semester IN ('Ganjil', 'Genap')),
    hari           VARCHAR(20) NOT NULL CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    jam_ke         VARCHAR(20) NOT NULL,
    waktu_mulai    TIME NOT NULL,
    waktu_selesai  TIME NOT NULL,
    kelas          VARCHAR(30) NOT NULL,
    mata_pelajaran VARCHAR(100) NOT NULL,
    ruangan        VARCHAR(50) DEFAULT 'Ruang Kelas',
    jumlah_jp      INT NOT NULL DEFAULT 2,
    is_deleted     BOOLEAN DEFAULT FALSE,
    created_by     TEXT,
    updated_by     TEXT,
    created_at     TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at     TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 8. TABEL BEBAN MENGAJAR (24 JP VALIDATION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.beban_mengajar (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id           UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    tahun_ajaran      VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    semester          VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
    jp_tatap_muka     INT NOT NULL DEFAULT 0,
    tugas_tambahan    VARCHAR(100),
    jp_tugas_tambahan INT NOT NULL DEFAULT 0,
    ekstrakurikuler   VARCHAR(100),
    jp_ekskul         INT NOT NULL DEFAULT 0,
    total_jp          INT GENERATED ALWAYS AS (jp_tatap_muka + jp_tugas_tambahan + jp_ekskul) STORED,
    status_pemenuhan  VARCHAR(30) DEFAULT 'Terpenuhi' CHECK (status_pemenuhan IN ('Terpenuhi', 'Belum Terpenuhi')),
    keterangan        TEXT,
    is_deleted        BOOLEAN DEFAULT FALSE,
    created_by        TEXT,
    updated_by        TEXT,
    created_at        TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at        TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 9. TABEL ABSENSI (GPS & FOTO SELFIE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.absensi (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id          UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    tanggal          DATE NOT NULL,
    waktu_masuk      TIME,
    waktu_pulang     TIME,
    status_kehadiran VARCHAR(30) NOT NULL CHECK (status_kehadiran IN ('Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Cuti', 'Alpha')),
    keterangan       TEXT,
    foto_masuk_url   TEXT,
    foto_pulang_url  TEXT,
    lokasi_gps       VARCHAR(100),
    is_deleted       BOOLEAN DEFAULT FALSE,
    created_by       TEXT,
    updated_by       TEXT,
    created_at       TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at       TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_guru_tanggal UNIQUE (guru_id, tanggal)
);

-- ============================================================================
-- 10. TABEL PKG (PENILAIAN KINERJA GURU / SKP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pkg (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id              UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    tahun_penilaian      INT NOT NULL,
    periode              VARCHAR(30) DEFAULT 'Tahunan',
    skor_perencanaan     NUMERIC(5, 2) NOT NULL,
    skor_pelaksanaan     NUMERIC(5, 2) NOT NULL,
    skor_evaluasi        NUMERIC(5, 2) NOT NULL,
    skor_profesionalisme NUMERIC(5, 2) NOT NULL,
    skor_kehadiran       NUMERIC(5, 2) NOT NULL,
    nilai_akhir          NUMERIC(5, 2) NOT NULL,
    predikat             VARCHAR(30) NOT NULL CHECK (predikat IN ('Amat Baik', 'Baik', 'Cukup', 'Sedang', 'Kurang')),
    nama_penilai         VARCHAR(150) NOT NULL,
    nip_penilai          VARCHAR(30),
    catatan_rekomendasi  TEXT,
    file_laporan_url     TEXT,
    is_deleted           BOOLEAN DEFAULT FALSE,
    created_by           TEXT,
    updated_by           TEXT,
    created_at           TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at           TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 11. TABEL PRESTASI
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prestasi (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id         UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    kategori        VARCHAR(50) DEFAULT 'Guru Berprestasi' CHECK (kategori IN ('Guru Berprestasi', 'Pembimbing Siswa', 'Karya Inovasi', 'Penghargaan Dedikasi')),
    nama_prestasi   VARCHAR(200) NOT NULL,
    tingkat         VARCHAR(50) NOT NULL CHECK (tingkat IN ('Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional')),
    peringkat_juara VARCHAR(50) NOT NULL,
    tahun           INT NOT NULL,
    penyelenggara   VARCHAR(150) NOT NULL,
    nomor_piagam    VARCHAR(100),
    file_piagam_url TEXT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_by      TEXT,
    updated_by      TEXT,
    created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 12. TABEL PELATIHAN (PMM, GURU PENGGERAK, WORKSHOP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pelatihan (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id             UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    nama_pelatihan      VARCHAR(200) NOT NULL,
    jenis_pelatihan     VARCHAR(100) DEFAULT 'Pelatihan Mandiri PMM' CHECK (jenis_pelatihan IN ('Pelatihan Mandiri PMM', 'Diklat Fungsional', 'Workshop / Bimtek', 'Seminar / Webinar', 'Guru Penggerak')),
    penyelenggara       VARCHAR(150) NOT NULL,
    pola_jp             INT NOT NULL DEFAULT 32,
    tanggal_mulai       DATE NOT NULL,
    tanggal_selesai     DATE NOT NULL,
    tahun               INT NOT NULL,
    nomor_sertifikat    VARCHAR(100),
    file_sertifikat_url TEXT,
    is_deleted          BOOLEAN DEFAULT FALSE,
    created_by          TEXT,
    updated_by          TEXT,
    created_at          TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at          TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 13. TABEL DOKUMEN & BERKAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dokumen (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id            UUID NOT NULL REFERENCES public.guru(id) ON DELETE CASCADE,
    kategori_dokumen   VARCHAR(50) NOT NULL CHECK (kategori_dokumen IN ('KTP', 'KK', 'NPWP', 'Ijazah', 'Transkrip', 'SK Kepegawaian', 'Sertifikat Pendidik', 'Pakta Integritas', 'SK Pembagian Tugas', 'Dokumen Lainnya')),
    nama_dokumen       VARCHAR(200) NOT NULL,
    nomor_dokumen      VARCHAR(100),
    tanggal_terbit     DATE,
    tanggal_kadaluarsa DATE,
    file_url           TEXT NOT NULL,
    ukuran_file_kb     INT,
    keterangan         TEXT,
    is_deleted         BOOLEAN DEFAULT FALSE,
    created_by         TEXT,
    updated_by         TEXT,
    created_at         TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at         TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 14. TABEL AUDIT LOGS (RIWAYAT AKTIVITAS LENGKAP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID,
    username      VARCHAR(100) NOT NULL,
    role          VARCHAR(30) DEFAULT 'guru',
    aksi          VARCHAR(50) NOT NULL,
    tabel_terkait VARCHAR(50) NOT NULL,
    record_id     UUID,
    data_lama     JSONB,
    data_baru     JSONB,
    deskripsi     TEXT NOT NULL,
    ip_address    VARCHAR(50),
    user_agent    TEXT,
    created_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- 15. TABEL PENGATURAN APLIKASI
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pengaturan_aplikasi (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunci      VARCHAR(100) NOT NULL UNIQUE,
    nilai      TEXT,
    keterangan TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- INDEXES UNTUK KECEPATAN QUERY TINGGI (<100ms)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_guru_nama          ON public.guru(nama_lengkap);
CREATE INDEX IF NOT EXISTS idx_guru_nuptk         ON public.guru(nuptk);
CREATE INDEX IF NOT EXISTS idx_guru_nip           ON public.guru(nip);
CREATE INDEX IF NOT EXISTS idx_guru_status        ON public.guru(status_keaktifan);
CREATE INDEX IF NOT EXISTS idx_guru_deleted       ON public.guru(is_deleted);
CREATE INDEX IF NOT EXISTS idx_kepeg_guru         ON public.kepegawaian(guru_id);
CREATE INDEX IF NOT EXISTS idx_kepeg_status       ON public.kepegawaian(status_kepegawaian);
CREATE INDEX IF NOT EXISTS idx_pend_guru          ON public.pendidikan(guru_id);
CREATE INDEX IF NOT EXISTS idx_sertif_guru        ON public.sertifikasi(guru_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_guru        ON public.jadwal_mengajar(guru_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_hari        ON public.jadwal_mengajar(hari, kelas);
CREATE INDEX IF NOT EXISTS idx_beban_guru         ON public.beban_mengajar(guru_id);
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal    ON public.absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_guru_tgl   ON public.absensi(guru_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_pkg_guru           ON public.pkg(guru_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_guru       ON public.dokumen(guru_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_kat        ON public.dokumen(kategori_dokumen);
CREATE INDEX IF NOT EXISTS idx_audit_created      ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_guru      ON public.profiles(guru_id);

-- ============================================================================
-- SEED DATA AWAL PROFIL SEKOLAH & PENGATURAN
-- ============================================================================
INSERT INTO public.profil_sekolah (
    npsn, nss, nama_sekolah, status_sekolah, akreditasi, alamat_lengkap,
    desa_kelurahan, kecamatan, kabupaten_kota, provinsi, kode_pos, telepon, email,
    nama_kepala_sekolah, nip_kepala_sekolah
) VALUES (
    '20527136', '101052610041', 'SD NEGERI SUMBER WARU 2', 'Negeri', 'B',
    'ln 2, Sumber Waru 1, Sumber Waru, Kec. Waru, Kabupaten Pamekasan, Jawa Timur',
    'Sumber Waru', 'Waru', 'Kabupaten Pamekasan', 'Jawa Timur', '69353',
    '0819-5381-2155', 'sdnegerisumberwaru2@gmail.com',
    'FAUZAN, S.Pd.SD.', '19720602 199605 1 001'
) ON CONFLICT (npsn) DO NOTHING;

INSERT INTO public.pengaturan_aplikasi (kunci, nilai, keterangan) VALUES
('tahun_ajaran_aktif', '2026/2027', 'Tahun Pelajaran Berjalan'),
('semester_aktif', 'Ganjil', 'Semester Berjalan'),
('jam_masuk_kerja', '07:00', 'Batas Jam Masuk Guru'),
('jam_pulang_kerja', '13:30', 'Jam Pulang Guru'),
('toleransi_terlambat_menit', '15', 'Toleransi keterlambatan dalam menit'),
('radius_absen_meter', '200', 'Radius presensi GPS sekolah'),
('latitude_sekolah', '-6.981234', 'Koordinat Latitude SDN Sumber Waru 2'),
('longitude_sekolah', '113.567890', 'Koordinat Longitude SDN Sumber Waru 2')
ON CONFLICT (kunci) DO NOTHING;
