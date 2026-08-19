# Deploy Backend (Vercel / Render)

Panduan singkat untuk deploy backend Node/Express ini.

1. Pastikan Anda tidak menyimpan file .env di repo. Gunakan Secrets/Environment Variables di platform hosting.

Required environment variables:
- PORT (opsional, Vercel mengatur sendiri)
- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET (gunakan string kuat)
- ADMIN_USERNAME (opsional; user yang otomatis diberi role admin saat register)

Vercel (recommended):
- Buat project baru dan sambungkan ke repo GitHub.
- Atur Build Command: (none) — backend untuk Vercel Serverless Node akan digunakan via "vercel.json" atau API Routes.
- Set environment variables di dashboard Vercel > Settings > Environment.

Render / Heroku:
- Buat service baru, sambungkan repo, atur start command: node backend/server.js
- Set environment variables di dashboard service.

Catatan:
- Setelah deploy, jalankan skrip seed untuk membuat admin awal (jika diperlukan) dengan ADMIN_USERNAME dan ADMIN_PASSWORD di environment.
