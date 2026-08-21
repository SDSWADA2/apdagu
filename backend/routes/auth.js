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

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return secret || 'dev-only-jwt-secret-change-me';
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (!Number.isInteger(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
  throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15.');
}

// ============================================================================
// POST /api/auth/login
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const normalizedUsername = username.trim();
    if (!normalizedUsername || normalizedUsername.length > 100 || password.length < 1 || password.length > 200) {
      return res.status(400).json({ error: 'Format input tidak valid.' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE LIMIT 1',
      [normalizedUsername]
    );

    if (users.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      guru_id: user.guru_id || null,
    };
    const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });

    const { password_hash: _passwordHash, ...safeUser } = user;

    return res.json({
      message: 'Login berhasil.',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('[AUTH] Error saat login:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ============================================================================
// GET /api/auth/me — Mendapatkan info user yang sedang login
// ============================================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, nama_lengkap, email, role, guru_id, foto_url, last_login FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan atau sudah dinonaktifkan.' });
    }

    return res.json({ user: users[0] });
  } catch (error) {
    console.error('[AUTH] Error fetching current user:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ============================================================================
// POST /api/auth/change-password — Ganti password user sendiri
// ============================================================================
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};

    if (typeof current_password !== 'string' || typeof new_password !== 'string') {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
    }
    if (new_password.length < 12 || new_password.length > 200) {
      return res.status(400).json({ error: 'Password baru harus 12–200 karakter.' });
    }
    if (current_password === new_password) {
      return res.status(400).json({ error: 'Password baru tidak boleh sama dengan password lama.' });
    }

    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const match = await bcrypt.compare(current_password, users[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Password lama tidak cocok.' });
    }

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, req.user.id]
    );

    return res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('[AUTH] Error changing password:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Dev-only helper. Never exposed when NODE_ENV=production.
if (process.env.NODE_ENV !== 'production') {
  router.post('/hash-password', async (req, res) => {
    try {
      const { password } = req.body || {};
      if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
        return res.status(400).json({ error: 'Password harus 12–200 karakter.' });
      }
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      return res.json({ hash });
    } catch (error) {
      console.error('[AUTH] Hash password error:', error);
      return res.status(500).json({ error: 'Gagal membuat hash password.' });
    }
  });
}

module.exports = router;
