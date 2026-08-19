<img width="748" height="846" alt="image" src="https://github.com/user-attachments/assets/24e4c51d-284f-44fd-b5c5-054f9488794d" /># 🎓 APLIKASI DATABASE GURU SD PROFESIONAL
### **SD NEGERI SUMBER WARU 2**
*Standar Administrasi Kurikulum Merdeka, Dapodik, dan Kementerian Pendidikan Dasar & Menengah*

---

## 🌟 Tentang Aplikasi

**Aplikasi Database Guru SD Profesional** adalah sistem informasi manajemen pendidik dan tenaga kependidikan (PTK) berbasis web yang dirancang khusus untuk **SD Negeri Sumber Waru 2** (Kecamatan Waru, Kabupaten Pamekasan).

Aplikasi ini menyajikan visual modern bergaya **Glassmorphism**, responsif di semua perangkat (Desktop, Tablet, Mobile), dilengkapi fitur **PWA (Progressive Web App)**, multi-user authentication, tanda tangan digital, QR code verifikasi, generator kartu identitas guru 2 sisi (CR80), dan pencetakan standar dinas A4.

---

## 🚀 Fitur Utama (14 Modul Lengkap)

| No | Modul | Deskripsi Fitur |
|---|---|---|
| 1 | **Dashboard Eksekutif** | Real-time KPI (Total Guru, PNS, PPPK, Honorer, Sertifikasi), 4 Grafik Interaktif Chart.js (Usia, Pendidikan, Status Kepegawaian, Tren Kehadiran), Radar Guru Ulang Tahun Bulan Ini, Guru Masa Pengabdian Terlama, dan Notifikasi Berkas Kadaluarsa. |
| 2 | **Data Guru (Master Data)** | Profil guru sangat lengkap (NUPTK, NIP, Nama Lengkap + Gelar, TTL, Agama, Kontak HP/WA, Email, Alamat RT/RW/Desa/Kec/Kab/Prov/Kode Pos), Tanda Tangan Digital Canvas Pad, Live QR Code Generator, Filter & Pencarian Cepat, Sorting, dan Detail Modal Komprehensif. |
| 3 | **Riwayat Pendidikan** | Multi-record pendidikan formal (Jenjang S1/S2/D3/SMA, Institusi, Program Studi, Tahun Masuk/Lulus, IPK, No Ijazah). |
| 4 | **Sertifikasi Guru** | Data Sertifikat Pendidik (PPG), Bidang Studi Sertifikasi, Nomor Registrasi Guru (NRG), LPTK Penyelenggara, Tahun, dan Status Berlaku. |
| 5 | **Kepegawaian** | Status Pegawai (PNS, PPPK, Honorer BOS/Daerah), Jabatan, Pangkat/Golongan (III/a s.d IV/c), TMT Pengangkatan, No SK, dan **Kalkulasi Otomatis Masa Kerja (Tahun & Bulan)**. |
| 6 | **Jadwal Mengajar** | Jadwal Pembelajaran Kurikulum Merdeka (Fase A: Kelas 1-2, Fase B: Kelas 3-4, Fase C: Kelas 5-6), Hari, Jam Pelajaran, Ruangan, dan Hitung Otomatis Jumlah JP. |
| 7 | **Beban Mengajar (24 JP)** | Rekap jam tatap muka, tugas tambahan (Wali Kelas, Pembina Pramuka, Bendahara BOS, Operator Dapodik, Tim TPPK, Kepala Perpustakaan), ekstrakurikuler, dan **Validasi Otomatis Pemenuhan Syarat 24 JP Sertifikasi**. |
| 8 | **Absensi & Presensi** | Pencatatan Presensi Harian (Hadir, Izin, Sakit, Dinas Luar, Alpha), Jam Masuk/Pulang, Rekapitulasi Kalender & Persentase Kehadiran Bulanan. |
| 9 | **Penilaian Kinerja (PKG/SKP)** | Evaluasi 5 Dimensi (Perencanaan 20%, Pelaksanaan 30%, Evaluasi 20%, Profesionalisme 15%, Kehadiran 15%), **Hitung Nilai Akhir Otomatis** dan **Konversi Predikat Kinerja (Amat Baik, Baik, Cukup, Sedang, Kurang)**. |
| 10 | **Prestasi** | Rekam jejak prestasi lomba guru dan siswa binaan (Tingkat Kecamatan, Kabupaten, Provinsi, Nasional, Internasional, Peringkat Juara, Tahun, No Piagam). |
| 11 | **Pelatihan & PMM** | Catatan Aksi Nyata Pelatihan Mandiri PMM, Diklat Fungsional, Workshop/Bimtek, Guru Penggerak, Pola JP (32 JP, dst), dan No Sertifikat. |
| 12 | **Dokumen Digital (E-Arsip)** | Manajemen arsip digital (KTP, KK, NPWP, Ijazah, SK Kepegawaian, Sertifikat Pendidik, Pakta Integritas) dengan filter kategori & peringatan masa berlaku SK. |
| 13 | **Laporan & ID Card** | **Generator ID Card Guru 2 Sisi (Front & Back)** standar CR80 dengan QR Code & Barcode siap Cetak dan Unduh Gambar (PNG), **Cetak Biodata Lengkap A4 Resmi Dinas**, dan **Export Excel (.xlsx)** untuk seluruh data. |
| 14 | **Pengaturan & Sistem** | Profil Lembaga SDN Sumber Waru 2 (NPSN, NSS, Alamat, Akreditasi, KS), Manajemen Pengguna (Admin, Operator, Guru), Audit Log Aktivitas, Cadangan Database (JSON Export/Import & DDL SQL Script), serta Dark/Light Mode. |

---

## 🛠️ Arsitektur & Teknologi

* **Frontend**: HTML5, CSS3 kustom (CSS Grid, Flexbox, Custom Properties, Glassmorphism `backdrop-filter: blur(16px)`), JavaScript ES6+ (Modular Object-Oriented Architecture).
* **Framework UI**: Bootstrap 5.3.3 + Bootstrap Icons 1.11.3.
* **Backend API**: Node.js dengan Express.js (menyediakan otentikasi nyata menggunakan `bcrypt`, JSON Web Tokens JWT, dan sinkronisasi data).
* **Keamanan API**: Helmet (Security Headers), express-rate-limit (Rate Limiting), JWT.
* **Penyimpanan Data**: 
  - *Offline-first*: IndexedDB & LocalStorage (melalui wrapper `StateManager`)
  - *Server-side*: Skema relasional untuk PostgreSQL/MySQL (`database_schema.sql`)
* **Ekspor & Utilitas**: `SheetJS (xlsx)`, `jsPDF & html2canvas`, `QRCode.js`, `Canvas Signature`.
* **PWA**: Service Worker (`sw.js`) dan `manifest.json` (Offline ready dengan background sync).

---

## 📁 Struktur Berkas

```
aplikasi-database-guru-sd/
├── index.html                   # Halaman Single Page Application (14 Menu Utama)
├── manifest.json                # PWA Web App Manifest
├── sw.js                        # PWA Service Worker (Offline Cache)
├── database_schema.sql          # Skema DDL Database SQL Relasional (14 Tabel)
├── README.md                    # Dokumentasi & Panduan Lengkap
├── css/
│   ├── style.css                # Desain Utama, Glassmorphism & Dark Mode
│   ├── idcard.css               # Styling Layout ID Card Guru 2 Sisi (CR80)
│   └── print.css                # Styling Cetak Format A4 Resmi & ID Card
├── js/
│   ├── app.js                   # Entry Point Aplikasi & SPA Router
│   ├── state.js                 # State Manager, LocalStorage Handler & Seeder
│   ├── auth.js                  # Otentikasi Multi-User & Role-Based Access
│   ├── utils/
│   │   ├── helpers.js           # Formatter Tanggal, Kalkulator Umur, Masa Kerja, 24 JP, PKG
│   │   └── export_utils.js      # Wrapper Excel, PDF, QR Code & Image Downloader
│   └── modules/
│       ├── dashboard.js         # Logika Statistik, Chart.js & Alert
│       ├── guru.js              # CRUD Guru, Signature Canvas & Modal Detail
│       ├── pendidikan.js        # Riwayat Pendidikan Guru
│       ├── sertifikasi.js       # Sertifikasi Pendidik (PPG)
│       ├── kepegawaian.js       # Data Kepegawaian & Kenaikan Pangkat
│       ├── jadwal.js            # Jadwal Mengajar Kurikulum Merdeka
│       ├── beban_mengajar.js    # Beban Mengajar & Validasi 24 JP
│       ├── absensi.js           # Presensi Harian & Rekap Bulanan
│       ├── pkg.js               # Penilaian Kinerja Guru & Predikat SKP
│       ├── prestasi.js          # Prestasi Guru & Pembimbing Siswa
│       ├── pelatihan.js         # Pelatihan Mandiri PMM & Diklat Dinas
│       ├── dokumen.js           # E-Arsip Dokumen Digital
│       ├── laporan.js           # Cetak Biodata A4, Generator ID Card & Excel
│       └── pengaturan.js        # Profil Sekolah, Users, Audit Log & Backup
└── assets/
    └── icons/
        ├── icon-192.svg         # Icon PWA 192x192
        └── icon-512.svg         # Icon PWA 512x512
```

---

## ⚡ Cara Menjalankan Aplikasi

Aplikasi ini menggunakan arsitektur hibrida (Offline-First SPA + Node.js API).

### Langkah 1: Menjalankan Backend API (Otentikasi & Sinkronisasi Server)
Backend diperlukan untuk login aman dengan otentikasi sesungguhnya (Bcrypt + JWT) dan menyimpan data tersentralisasi.
1. Pastikan Anda telah menginstal **Node.js** (v16 atau lebih baru).
2. Buka terminal/command prompt, arahkan ke folder `backend`.
3. Instal semua dependensi:
   ```bash
   cd backend
   npm install
   ```
4. Jalankan server:
   ```bash
   npm start
   ```
   Backend akan berjalan di `http://localhost:3000`.

### Langkah 2: Menjalankan Frontend Web (Klien)
Setelah backend berjalan, Anda dapat menyajikan Frontend.
1. Buka terminal baru, arahkan ke folder utama aplikasi (`aplikasi-database-guru-sd`).
2. Gunakan HTTP server lokal pilihan Anda. Contoh:
   ```bash
   npx serve .
   ```
3. Buka browser di URL yang diberikan (misal: `http://localhost:3000` atau `http://localhost:8080`).

> **Catatan Mode Offline**: Jika backend dimatikan atau tidak dapat dijangkau, aplikasi akan secara cerdas ber-fallback menggunakan data lokal di IndexedDB (PWA Offline Mode). Data akan di-sync secara background ketika server kembali hidup.

## 👥 Hak Akses & Akun Demo

Aplikasi menyediakan simulasi pergantian peran secara instan melalui dropdown **Peran** di pojok kanan atas:

1. **Administrator (`admin`)**:
   - Memiliki akses penuh terhadap seluruh 14 modul, manajemen pengguna, perubahan profil sekolah, audit log, dan backup/restore database.
2. **Operator Dapodik (`operator`)**:
   - Memiliki akses input data guru, riwayat pendidikan, sertifikasi, jadwal, beban mengajar, absensi, unggah berkas dokumen, dan cetak kartu.
3. **Guru (`guru`)**:
   - Memiliki akses melihat data guru, presensi harian, mengecek jadwal mengajar, mengunduh biodata A4 dan kartu identitas guru pribadi.

---

## 🗄️ Implementasi Database SQL

File [`database_schema.sql`](file:///C:/Users/SUMBER%20WARU%202%20%282024%29/.gemini/antigravity-ide/scratch/aplikasi-database-guru-sd/database_schema.sql) berisi skrip DDL SQL relasional lengkap yang siap di-import ke PostgreSQL atau MySQL dengan 14 tabel berelasi:
* `profil_sekolah`
* `users`
* `guru`
* `kepegawaian`
* `pendidikan`
* `sertifikasi`
* `jadwal_mengajar`
* `beban_mengajar`
* `absensi`
* `pkg`
* `prestasi`
* `pelatihan`
* `dokumen`
* `audit_logs`

---

## 🏫 Identitas Lembaga
* **Nama Sekolah**: SD Negeri Sumber Waru 2
* **NPSN**: 20527136
* **NSS**: 101052610041
* **Akreditasi**: B (Baik)
* **Alamat**: Jln 2, Sumber Waru 1, Sumber Waru, Kec. Waru, Kabupaten Pamekasan, Jawa Timur (69353)
* **Kepala Sekolah**: FAUZAN, S.Pd.SD. (NIP. 197206021996051001)

---
*Dikembangkan secara profesional dengan standar tata kelola data pendidikan nasional.*
