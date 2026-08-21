@echo off
echo =======================================================
echo   Aplikasi Database Guru SD Negeri Sumber Waru 2
echo =======================================================
echo.
echo [1] Mengaktifkan Backend Server (Node.js)...
cd backend
start cmd /k "npm run dev"

echo.
echo [2] Membuka Frontend (Aplikasi Web)...
timeout /t 3 >nul
cd ..
start index.html

echo.
echo Seluruh sistem telah diaktifkan!
echo Jendela backend server (cmd hitam) biarkan tetap terbuka.
pause
