# Panduan Database & Migrasi — SD Negeri Sumber Waru 2

Direktori ini berisi seluruh skrip konfigurasi, skema DDL 15 tabel, migrasi Knex, dan seeder untuk database MySQL / MariaDB.

---

## 🛠️ Cara Cepat Inisialisasi Database (Rekomendasi)

Cukup jalankan satu perintah berikut untuk membuat database `db_guru_sd`, 15 tabel, dan akun demo secara otomatis:

```bash
cd backend
npm run db:setup
```

Skrip ini akan:
1. Menghubungkan ke server MySQL (`localhost:3306`).
2. Membuat database `CREATE DATABASE IF NOT EXISTS \`db_guru_sd\`` dengan charset `utf8mb4_unicode_ci`.
3. Mengimpor skema lengkap 15 tabel dari `migrations/001_initial_schema.sql`.
4. Mengisi akun pengguna awal (`admin`, `operator`, `guru1`, `guru2`) dengan password terenkripsi `bcrypt`.

---

## 📋 Penggunaan Knex Migrations Manual

Jika ingin menggunakan Knex CLI:

1. **Jalankan Migrasi:**
   ```bash
   npm run migrate
   ```

2. **Jalankan Seeder Pengguna:**
   ```bash
   npm run seed
   ```

3. **Rollback Migrasi (Hapus Tabel):**
   ```bash
   npm run migrate:rollback
   ```

---

## 🗄️ Daftar 15 Tabel Database

1. `profil_sekolah` — Data identitas resmi sekolah & kepala sekolah
2. `users` — Akun login sistem (Admin, Operator, Guru) dengan password hash bcrypt
3. `guru` — Master biodata guru lengkap (NUPTK, NIP, NIK, alamat, foto, kontak)
4. `kepegawaian` — Riwayat status kepegawaian (PNS, PPPK, Honorer, SK, Gaji)
5. `pendidikan` — Riwayat jenjang pendidikan formal guru (S1, S2, IPK, Ijazah)
6. `sertifikasi` — Sertifikat pendidik, PPG, nomor registrasi guru (NRG)
7. `jadwal_mengajar` — Jadwal mengajar Kurikulum Merdeka per semester/kelas
8. `beban_mengajar` — Rekap jam tatap muka, tugas tambahan, dan pemenuhan 24 JP
9. `absensi` — Presensi harian guru (waktu masuk, pulang, status kehadiran, GPS)
10. `pkg` — Penilaian Kinerja Guru (SKP / E-Kinerja)
11. `prestasi` — Rekam jejak penghargaan & kejuaraan guru/siswa binaan
12. `pelatihan` — Diklat, bimtek, dan sertifikat PMM (Pengembangan Diri)
13. `dokumen` — E-Arsip dokumen digital guru (SK, Ijazah, KTP, KK, Sertifikat)
14. `audit_logs` — Rekam jejak aktivitas sistem
15. `pengaturan_aplikasi` — Pengaturan tema visual, integrasi, dan preferensi aplikasi
