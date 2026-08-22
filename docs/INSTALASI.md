# Panduan Instalasi & Menjalankan Lokal — APDAGU Enterprise v2.0
**SD Negeri Sumber Waru 2 (Kabupaten Pamekasan)**

Aplikasi ini dapat dijalankan secara lokal di komputer mana pun tanpa instalasi server database lokal (seperti MySQL/PostgreSQL manual di laptop), karena database dan backend di-handle secara cloud dan realtime oleh Supabase.

---

## 1. Menjalankan Langsung dengan Web Server Lokal

Karena aplikasi menggunakan ES2023 Modules (`<script type="module">`), browser memerlukan server HTTP lokal (bukan protokol `file:///`).

### Menggunakan Python (Tersedia secara bawaan):
```bash
# Python 3
python -m http.server 8080
```
Buka browser di: `http://localhost:8080`

### Menggunakan Node.js / npx `serve` / `live-server`:
```bash
npx serve .
# atau
npx live-server
```

### Menggunakan Ekstensi VS Code:
Klik kanan pada `index.html` > Pilih **"Open with Live Server"**.

---

## 2. Akun Demo Bawaan
Untuk kemudahan pengujian pertama kali:
- **Admin**: `admin@sdnsumberwaru2.sch.id` (Password: `admin123`)
- **Operator**: `operator@sdnsumberwaru2.sch.id` (Password: `operator123`)
- **Guru**: `guru@sdnsumberwaru2.sch.id` (Password: `guru123`)
