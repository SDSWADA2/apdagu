# Panduan Database & Migrasi — SD Negeri Sumber Waru 2

Direktori ini berisi seluruh skrip konfigurasi, skema DDL 15 tabel, migrasi Knex, dan seeder untuk database MySQL / MariaDB.

---

## ⚡ Cara Tercepat — Inisialisasi Database Otomatis (1 Perintah)

Cukup jalankan **satu perintah** ini untuk membuat database, 15 tabel, dan akun demo secara otomatis:

```bash
cd e:\apdagu\backend
npm run db:setup
```

Skrip akan otomatis:
1. 🔌 Menghubungkan ke server MySQL (`localhost:3306`)
2. 🗃️ Membuat database `db_guru_sd` jika belum ada
3. 📋 Mengimpor skema 15 tabel dari `migrations/001_initial_schema.sql`
4. 🏫 Mengisi data profil sekolah awal
5. 👥 Membuat 4 akun pengguna demo dengan password terenkripsi bcrypt

> **Syarat:** MySQL / XAMPP sudah berjalan dan konfigurasi `backend/.env` sudah benar.

---

## 📋 Akun Login Demo

| Username | Password | Peran |
|---|---|---|
| `admin` | `admin123` | Admin (Kepala Sekolah) |
| `operator` | `operator123` | Operator Dapodik |
| `guru1` | `guru123` | Guru Kelas |
| `guru2` | `guru123` | Guru Kelas |

---

## ⚙️ Konfigurasi Database (`backend/.env`)

Buat file `backend/.env` (salin dari `.env.example`):

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_guru_sd
DB_CONNECTION_LIMIT=10
DB_SSL=false

JWT_SECRET=super_secret_key_sdn_sumber_waru_2_2026
JWT_EXPIRES_IN=8h

ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000
```

> **Default XAMPP:** `DB_USER=root`, `DB_PASSWORD=` (kosong / tidak perlu diisi)

---

## 🔧 Perintah Migrasi Manual (Knex)

Jika ingin mengelola migrasi secara manual:

```bash
# Menjalankan semua migrasi (buat tabel)
npm run migrate

# Membatalkan (rollback) migrasi terakhir
npm run migrate:rollback

# Menjalankan seeder akun pengguna
npm run seed
```

---

## 🗄️ Struktur 15 Tabel Database

| # | Nama Tabel | Deskripsi |
|---|---|---|
| 1 | `profil_sekolah` | Identitas resmi sekolah, NPSN, NSS, kepala sekolah |
| 2 | `users` | Akun login sistem (Admin, Operator, Guru) — password hash bcrypt |
| 3 | `guru` | Master biodata guru lengkap (NUPTK, NIP, NIK, foto, kontak, alamat) |
| 4 | `kepegawaian` | Status kepegawaian guru (PNS/PPPK/Honorer, SK, pangkat, gaji) |
| 5 | `pendidikan` | Riwayat pendidikan formal guru (S1/S2, IPK, nomor ijazah) |
| 6 | `sertifikasi` | Sertifikat pendidik, PPG, NRG (Nomor Registrasi Guru) |
| 7 | `jadwal_mengajar` | Jadwal mengajar Kurikulum Merdeka per kelas dan semester |
| 8 | `beban_mengajar` | Rekap jam tatap muka, tugas tambahan, validasi pemenuhan 24 JP |
| 9 | `absensi` | Presensi harian guru (waktu masuk/pulang, status, GPS, lampiran) |
| 10 | `pkg` | Penilaian Kinerja Guru / SKP / E-Kinerja |
| 11 | `prestasi` | Penghargaan & kejuaraan guru dan siswa binaan |
| 12 | `pelatihan` | Diklat, bimtek, sertifikat PMM / Pengembangan Diri |
| 13 | `dokumen` | E-Arsip dokumen digital guru (SK, KTP, KK, ijazah, sertifikat) |
| 14 | `audit_logs` | Rekam jejak seluruh aktivitas pengguna di sistem |
| 15 | `pengaturan_aplikasi` | Konfigurasi tema, integrasi SMTP/WA, dan preferensi sistem |

Semua relasi antar tabel menggunakan **Foreign Key** `guru_id → guru(id)` dengan **`ON DELETE CASCADE`** (data turunan otomatis terhapus saat data guru dihapus).

---

## 📁 Struktur Direktori Backend

```
backend/
├── config/
│   └── db.js                      # Konfigurasi connection pool MySQL
├── middleware/
│   └── auth.js                    # Middleware JWT verifyToken & requireRole
├── migrations/
│   ├── 001_initial_schema.js      # Knex migration runner
│   └── 001_initial_schema.sql     # DDL 15 tabel (dieksekusi oleh migration)
├── routes/
│   ├── auth.js                    # POST /api/auth/login, /me, /change-password
│   ├── guru.js                    # CRUD /api/guru (master data guru)
│   ├── kepegawaian.js             # CRUD /api/kepegawaian
│   ├── jadwal.js                  # CRUD /api/jadwal
│   ├── absensi.js                 # CRUD /api/absensi + batch
│   ├── generic.js                 # CRUD /api/data/:table (14 tabel generik)
│   └── sync.js                    # /api/sync/* (pull/push/offline queue)
├── scripts/
│   └── setup_db.js                # Skrip setup database otomatis (npm run db:setup)
├── seeds/
│   └── 001_users.js               # Seeder pengguna demo (Knex)
├── .env                           # Konfigurasi aktif (JANGAN di-commit ke Git!)
├── .env.example                   # Template konfigurasi (aman di-commit)
├── knexfile.js                    # Konfigurasi Knex (dev/test/production)
├── package.json                   # Dependensi & scripts npm
└── server.js                      # Entry point Express.js
```

---

## 🔍 Verifikasi Koneksi

Setelah server berjalan (`npm run dev`), cek status database di:

- **Browser**: `http://localhost:3000/health`
- **Terminal**: Output startup otomatis menampilkan versi MySQL dan status koneksi

Respons `/health` yang sehat:
```json
{
  "status": "success",
  "message": "Server backend terhubung dengan baik",
  "uptime": 5,
  "database": "connected",
  "db_name": "db_guru_sd",
  "db_host": "localhost",
  "db_version": "8.0.30",
  "timestamp": "2026-08-21T14:00:00.000Z"
}
```

---

## 🚨 Pemecahan Masalah Umum

| Error | Penyebab | Solusi |
|---|---|---|
| `ECONNREFUSED` | MySQL belum berjalan | Buka XAMPP → klik **Start** pada MySQL |
| `ER_ACCESS_DENIED_ERROR` | User/password salah | Periksa `DB_USER` dan `DB_PASSWORD` di `.env` |
| `ER_BAD_DB_ERROR` | Database belum dibuat | Jalankan `npm run db:setup` |
| `ER_NO_SUCH_TABLE` | Tabel belum dibuat | Jalankan `npm run migrate` atau `npm run db:setup` |
| Port 3000 sudah terpakai | Proses lain menggunakan port ini | Ganti `PORT=3001` di `.env` |
