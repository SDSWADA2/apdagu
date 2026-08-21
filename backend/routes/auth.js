/**
 * ============================================================================
 * ROUTE: Autentikasi (Login, Logout, Ganti Password)
 * Aplikasi Database Guru SD Negeri Sumber Waru 2
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_sdn_sumber_waru_2_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = 12;

// ============================================================================
// POST /api/auth/login
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input dasar
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Format input tidak valid.' });
    }
    if (username.length > 100 || password.length > 200) {
      return res.status(400).json({ error: 'Input melebihi batas maksimum.' });
    }

    // Cari user berdasarkan username
    const { rows: users } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = TRUE LIMIT 1',
      [username.trim()]
    );

    if (users.length === 0) {
      // Gunakan waktu delay konsisten untuk mencegah user enumeration attack
      await new Promise(r => setTimeout(r, 200));
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = users[0];

    // Verifikasi password dengan bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // Update last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      guru_id: user.guru_id || null,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Hapus field sensitif dari response
    const { password_hash, ...safeUser } = user;

    res.json({
      message: 'Login berhasil.',
      token,
      user: safeUser,
    });

  } catch (error) {
    console.error('[AUTH] Error saat login:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ============================================================================
// GET /api/auth/me — Mendapatkan info user yang sedang login
// ============================================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { rows: users } = await pool.query(
      'SELECT id, username, nama_lengkap, email, role, guru_id, foto_url, last_login FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan atau sudah dinonaktifkan.' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('[AUTH] Error fetching current user:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ============================================================================
// POST /api/auth/change-password — Ganti password user sendiri
// ============================================================================
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }
    if (current_password === new_password) {
      return res.status(400).json({ error: 'Password baru tidak boleh sama dengan password lama.' });
    }

    // Ambil password hash saat ini
    const { rows: users } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // Verifikasi password lama
    const match = await bcrypt.compare(current_password, users[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Password lama tidak cocok.' });
    }

    // Hash password baru dan simpan
    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('[AUTH] Error changing password:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ============================================================================
// POST /api/auth/hash-password — Utility: Generate bcrypt hash (Dev Only)
// HAPUS di production!
// ============================================================================
if (process.env.NODE_ENV !== 'production') {
  router.post('/hash-password', async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password wajib diisi.' });
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    res.json({ hash, info: 'Simpan hash ini ke kolom password_hash di tabel users.' });
  });
}

module.exports = router;
