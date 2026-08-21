# Supabase Setup untuk SD Negeri Sumber Waru 2

Folder ini berisi konfigurasi dan skema database untuk proyek Supabase.

## Langkah Konfigurasi Database
1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Masuk ke menu **SQL Editor**.
3. *Copy-paste* isi dari folder `migrations/20240101000000_initial_schema.sql` dan jalankan (*Run*) untuk membuat tabel, relasi, index, dan menyalakan keamanan Row Level Security (RLS).
4. Buka menu **Project Settings -> API** di Supabase.
5. Salin *Project URL* dan *anon public key*.
6. Buka file `e:\apdagu\frontend\.env.example`, ubah namanya menjadi `.env.local` (atau buat file baru), lalu tempel kuncinya:
   ```env
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

Setelah itu, kembali ke terminal di folder `frontend` dan jalankan `npm install` lalu `npm run dev` untuk memulai aplikasi.
