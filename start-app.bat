@echo off
title Aplikasi Database Guru — SDN Sumber Waru 2
color 0A
chcp 65001 >nul 2>&1

echo.
echo ============================================================================
echo   🏫  SD NEGERI SUMBER WARU 2 — KABUPATEN PAMEKASAN
echo   📋  Sistem Informasi Database Guru dan Tenaga Kependidikan
echo   🚀  Versi 2.0 — Multi-User Realtime (WebSocket + SSE)
echo ============================================================================
echo.

:: ─── Pindah ke direktori backend ─────────────────────────────────────────────
cd /d "%~dp0backend"

:: ─── LANGKAH 1: Install dependensi backend jika belum ─────────────────────────
echo [1/4] Memeriksa dan menginstall dependensi backend...
if not exist "node_modules\express" (
    echo       ^ Menginstall paket npm untuk pertama kali (mohon tunggu ~1 menit)...
    call npm install --prefer-offline --no-audit --loglevel=error
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install gagal. Pastikan Node.js terinstall dengan benar.
        echo         Download Node.js di: https://nodejs.org
        pause
        exit /b 1
    )
    echo       ^ Instalasi selesai!
) else (
    echo       ^ Dependensi sudah terpasang. Siap!
)
echo.

:: ─── LANGKAH 2: Perbaikan & Inisialisasi Database Otomatis ────────────────────
echo [2/4] Menginisialisasi database dan akun pengguna secara otomatis...
echo       ^ Pastikan XAMPP MySQL sudah berstatus "Start" (hijau) sebelum melanjutkan.
echo.

:: Jalankan auto_fix.js (setup DB + migrate + seed user)
node scripts\auto_fix.js
if errorlevel 1 (
    echo.
    echo [PERINGATAN] Setup database gagal atau dilewati.
    echo             Aplikasi akan tetap berjalan dalam mode Offline-First.
    echo             Jalankan XAMPP, nyalakan MySQL, lalu restart aplikasi ini.
    echo.
    timeout /t 3 /nobreak >nul
)
echo.

:: ─── LANGKAH 3: Cek apakah port 3000 sudah digunakan ─────────────────────────
echo [3/4] Memeriksa ketersediaan port 3000...
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       ^ Port 3000 sudah digunakan. Mencoba menghentikan proses lama...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        taskkill /PID %%p /F >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)
echo       ^ Port 3000 siap digunakan.
echo.

:: ─── LANGKAH 4: Buka browser dan jalankan server ─────────────────────────────
echo [4/4] Menjalankan server aplikasi...
echo.
echo ============================================================================
echo   🌐  Alamat Aplikasi   : http://localhost:3000
echo   📡  Health Check      : http://localhost:3000/health
echo   🔌  Realtime Engine   : WebSocket (Socket.IO) + SSE Fallback
echo   👤  Login Admin       : admin / admin123
echo   👤  Login Operator    : operator / operator123
echo   👤  Login Guru        : guru1 / guru123
echo ============================================================================
echo.
echo   Tekan Ctrl+C untuk menghentikan server.
echo.

:: Buka browser otomatis setelah delay 2 detik
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

:: Jalankan server
node server.js

echo.
echo [Server berhenti] Tekan sembarang tombol untuk keluar...
pause >nul
