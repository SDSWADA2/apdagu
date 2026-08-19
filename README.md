# README - tambahan setup

## Setup cepat (backend)

1. Jangan commit file backend/.env ke repo publik. Gunakan environment variables di hosting.
2. Contoh env vars (simpan di platform hosting):
   - DB_HOST
   - DB_USER
   - DB_PASSWORD
   - DB_NAME
   - JWT_SECRET
   - ADMIN_USERNAME (opsional)
3. Untuk membuat admin pertama kali, jalankan:
   ADMIN_USERNAME=admin ADMIN_PASSWORD=StrongPass node backend/scripts/seed_admin.js

4. Untuk menghapus file backend/.env dari history (jika pernah terekspos), jalankan di mesin lokal:

   # Install bfg (https://rtyley.github.io/bfg-repo-cleaner/)
   bfg --delete-files backend/.env
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force

   Catatan: operasi ini merusak history dan harus dilakukan dengan hati-hati.
