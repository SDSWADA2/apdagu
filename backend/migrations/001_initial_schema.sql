-- Initial schema migration (copied from database_schema.sql)
-- You can run this file using your migration tool or import directly into your DB

-- For convenience this migration contains the core CREATE TABLE statements used by the app.

-- Create profil_sekolah
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
);

-- Create users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(30) NOT NULL,
    guru_id INT,
    foto_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create guru (master)
CREATE TABLE IF NOT EXISTS guru (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nuptk VARCHAR(30) UNIQUE,
    nip VARCHAR(30) UNIQUE,
    nama_lengkap VARCHAR(150) NOT NULL,
    gelar_depan VARCHAR(50),
    gelar_belakang VARCHAR(50),
    jenis_kelamin VARCHAR(20) NOT NULL,
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
    status_keaktifan VARCHAR(30) DEFAULT 'Aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: Add other tables or import full database_schema.sql as needed
