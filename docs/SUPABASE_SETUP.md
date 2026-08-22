# Panduan Setup Supabase — APDAGU Enterprise v2.0
**SD Negeri Sumber Waru 2 (Kabupaten Pamekasan)**

Panduan ini berisi instruksi lengkap untuk mengonfigurasi database PostgreSQL, Row Level Security (RLS), Realtime replication, Storage Buckets, dan Autentikasi di Supabase.

---

## 1. Membuat Project Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Buat project baru dengan nama **`APDAGU Enterprise v2.0`**.
3. Simpan **Project URL** dan **Anon/Public Key** yang diberikan di menu **Project Settings > API**.

---

## 2. Menjalankan Skema Database & RLS
1. Buka menu **SQL Editor** di sidebar kiri Supabase Dashboard.
2. Klik tombol **New Query**.
3. Buka file [`supabase/schema_supabase.sql`](../supabase/schema_supabase.sql) atau [`src/database/schema.sql`](../src/database/schema.sql), lalu salin seluruh kodenya.
4. Tempel ke dalam SQL Editor Supabase, lalu klik tombol **Run** (atau tekan `Ctrl + Enter`).
5. Skema tabel dengan UUID Primary Key, Trigger otomatis `update_timestamp`, Trigger `audit_logs`, dan RLS policies untuk Admin/Operator/Guru akan langsung aktif.

---

## 3. Konfigurasi Autentikasi (Supabase Auth)
1. Buka menu **Authentication > Users**.
2. Anda dapat membuat user admin pertama dengan mengklik **Add User > Create User**:
   - **Email**: `admin@sdnsumberwaru2.sch.id`
   - **Password**: `admin123` (atau password yang Anda tentukan)
   - **User Metadata**:
     ```json
     {
       "nama_lengkap": "Administrator Sekolah",
       "role": "admin"
     }
     ```
3. Ulangi untuk akun **Operator** (`operator@sdnsumberwaru2.sch.id`) dengan role `operator`, dan akun **Guru** dengan role `guru`.

---

## 4. Konfigurasi Storage Buckets
Skema SQL telah membuat bucket secara otomatis. Pastikan bucket berikut ada di menu **Storage**:
- `foto-guru` (Public: Yes)
- `dokumen` (Public: Yes)
- `ijazah` (Public: Yes)
- `sertifikat` (Public: Yes)
- `ttd` (Public: Yes)
- `logo` (Public: Yes)

---

## 5. Memverifikasi Realtime
1. Buka menu **Database > Replication**.
2. Pastikan publikasi `supabase_realtime` memuat tabel-tabel utama:
   - `guru`, `absensi`, `jadwal_mengajar`, `beban_mengajar`, `dokumen`, `audit_logs`, `kepegawaian`, dll.
3. Sekarang setiap penambahan / perubahan data dari Laptop A akan langsung muncul di Laptop B tanpa me-refresh halaman! 🎉
