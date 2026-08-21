-- ============================================================================
-- SKEMA DATABASE RELASIONAL: APLIKASI DATABASE GURU SD PROFESIONAL
-- SEKOLAH: SD NEGERI SUMBER WARU 2
-- Diadaptasi untuk Supabase (PostgreSQL)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: Users table can use Supabase Auth (auth.users)
-- But for backward compatibility with the existing schema, we keep a public profile table.
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL UNIQUE,
    nama_lengkap VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'operator', 'guru')),
    guru_id INT,
    foto_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE user_profiles ADD CONSTRAINT fk_users_guru FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE SET NULL;

-- (Sisa tabel-tabel lainnya dari database_schema.sql bisa dipindahkan ke sini, 
-- disesuaikan tipe data TIMESTAMP-nya menjadi TIMESTAMP WITH TIME ZONE)

-- 4. TABEL KEPEGAWAIAN GURU
CREATE TABLE IF NOT EXISTS kepegawaian (
    id SERIAL PRIMARY KEY,
    guru_id INT NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- INDEXES UNTUK OPTIMASI PERFORMA PENCARIAN SUPER CEPAT
CREATE INDEX idx_guru_nama ON guru(nama_lengkap);
CREATE INDEX idx_guru_nuptk ON guru(nuptk);
CREATE INDEX idx_guru_nip ON guru(nip);
CREATE INDEX idx_guru_status ON guru(status_keaktifan);
CREATE INDEX idx_kepegawaian_status ON kepegawaian(status_kepegawaian);

-- RLS (Row Level Security) untuk Supabase
ALTER TABLE profil_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE kepegawaian ENABLE ROW LEVEL SECURITY;

-- Contoh Kebijakan (Policies): Semua user tersertifikasi bisa membaca data profil
CREATE POLICY "Public profiles are viewable by authenticated users."
ON profil_sekolah FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Public guru viewable by authenticated users."
ON guru FOR SELECT
TO authenticated USING (true);
