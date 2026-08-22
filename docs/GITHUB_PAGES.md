# Panduan Deployment GitHub Pages — APDAGU Enterprise v2.0
**SD Negeri Sumber Waru 2 (Kabupaten Pamekasan)**

APDAGU Enterprise v2.0 dibangun secara murni menggunakan teknologi frontend modern (ES2023 Modules, Bootstrap 5.3, IndexedDB, Supabase Client SDK, PWA), sehingga **100% siap di-hosting langsung di GitHub Pages secara gratis tanpa perlu menyewa VPS backend**.

---

## Langkah-Langkah Deployment

### 1. Push Kode ke Repository GitHub
Pastikan seluruh file proyek telah di-commit dan di-push ke branch utama (`main`):

```bash
git add .
git commit -m "feat: APDAGU Enterprise v2.0 production ready"
git push origin main
```

### 2. Mengaktifkan GitHub Pages
1. Buka repository Anda di GitHub: `https://github.com/username/apdagu`
2. Klik tab **Settings** di bagian atas.
3. Di menu sidebar kiri, pilih **Pages**.
4. Di bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Pilih `main` / `root` (`/ (root)`).
5. Klik **Save**.

### 3. Selesai & Akses Aplikasi
Dalam waktu 1-2 menit, GitHub Pages akan meng-host aplikasi Anda di URL:
```
https://username.github.io/apdagu/
```

### 4. Menyesuaikan Konfigurasi Supabase
Jika Anda menggunakan project Supabase pribadi, pastikan untuk memperbarui `SUPABASE.URL` dan `SUPABASE.ANON_KEY` di file [`src/app/config.js`](../src/app/config.js):

```javascript
export const CONFIG = {
  SUPABASE: {
    URL: 'https://your-project-id.supabase.co',
    ANON_KEY: 'your-anon-key',
  },
  // ...
};
```
Lalu tambahkan URL GitHub Pages Anda ke daftar **Authentication > URL Configuration > Redirect URLs** di Supabase Dashboard agar login & redirect session berjalan lancar.
