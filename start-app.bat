@echo off
title Aplikasi Database Guru SD Negeri Sumber Waru 2
color 0A

echo ============================================================================
echo   SEKOLAH : SD NEGERI SUMBER WARU 2 (KABUPATEN PAMEKASAN)
echo   SISTEM  : Aplikasi Database Guru & Tenaga Kependidikan Profesional
echo   STATUS  : Memulai Server & Aplikasi Web Secara Otomatis...
echo ============================================================================
echo.

cd /d "%~dp0\backend"

:: Cek apakah node_modules sudah ada di backend
if not exist "node_modules\" (
    echo [1/3] Menginstal dependensi backend pertama kali...
    call npm install --silent
) else (
    echo [1/3] Dependensi backend siap.
)

echo [2/3] Memeriksa koneksi database dan inisialisasi otomatis...
echo [3/3] Menjalankan Server Aplikasi terpadu di port 3000...
echo.
echo ============================================================================
echo   URL Aplikasi & REST API : http://localhost:3000
echo   Health Check Server     : http://localhost:3000/health
echo   Mode Operasi            : Otomatis (Online Database + Offline IndexedDB)
echo ============================================================================
echo.

:: Buka browser secara otomatis setelah delay 1.5 detik
start "" http://localhost:3000

:: Jalankan server Node.js
npm start

pause
