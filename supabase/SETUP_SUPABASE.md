# ============================================================================
# PANDUAN SETUP SUPABASE — SD Negeri Sumber Waru 2
# ============================================================================

## Langkah 1: Jalankan Schema Database

1. Buka **Supabase SQL Editor**:
   https://supabase.com/dashboard/project/cjijssmdrmzufacisrjn/sql/new

2. Copy-paste **seluruh isi file** `schema_supabase.sql` ke SQL Editor

3. Klik tombol **Run** (atau Ctrl+Enter)

4. Pastikan muncul output: `Schema Supabase berhasil dibuat! 🎉`

---

## Langkah 2: Dapatkan Database Password

1. Buka: https://supabase.com/dashboard/project/cjijssmdrmzufacisrjn/settings/database

2. Scroll ke bagian **"Connection string"** atau **"Database Password"**

3. Copy password tersebut

4. Buka file `backend/.env` dan ganti `[YOUR_DB_PASSWORD]` dengan password asli:
   ```
   DATABASE_URL=postgresql://postgres.cjijssmdrmzufacisrjn:PASSWORD_ANDA@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

---

## Langkah 3: Install Dependencies Backend

Buka terminal di folder `backend/`, jalankan:
```bash
npm install
```

---

## Langkah 4: Jalankan Aplikasi

```bash
npm run dev
```

Atau klik file `Mulai_Aplikasi.bat`

Cek status di: http://localhost:3001/health

---

## Langkah 5: Aktifkan Realtime di Supabase Dashboard

1. Buka: https://supabase.com/dashboard/project/cjijssmdrmzufacisrjn/database/replication

2. Pastikan tabel-tabel berikut ada di **"supabase_realtime" publication**:
   - guru, kepegawaian, pendidikan, sertifikasi
   - jadwal_mengajar, beban_mengajar, absensi
   - pkg, prestasi, pelatihan, dokumen
   - profil_sekolah, users, audit_logs

   *(Ini sudah dilakukan otomatis oleh SQL schema di Langkah 1)*

---

## Kredensial Supabase

| Item | Value |
|------|-------|
| Project ID | `cjijssmdrmzufacisrjn` |
| Supabase URL | `https://cjijssmdrmzufacisrjn.supabase.co` |
| Anon Key (frontend) | `sb_publishable_Z7mmjmgqmYcOBpjlD9IKZA_JNj8D5HD` |
| Service Role Key (backend) | `sb_secret_02DSNBPbt6DFC5Tp4aYIOg_NzN6qGDT` |
| JWT Secret | `632a9814-e018-4096-9a8c-280fee0d4b07` |
| Dashboard | https://supabase.com/dashboard/project/cjijssmdrmzufacisrjn |

---

## Verifikasi Koneksi

Setelah server berjalan, buka browser ke:

```
http://localhost:3001/health
```

Pastikan response menampilkan:
```json
{
  "status": "success",
  "database": "connected",
  ...
  "supabase_client": "connected"
}
```

---

## Login Default

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password` | Admin |
| `operator` | `password` | Operator |

> ⚠️ **SEGERA GANTI PASSWORD** setelah pertama kali login!
