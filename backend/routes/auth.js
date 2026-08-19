/**
 * AUTENTIKASI: register + login + me + change-password
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'please_set_a_strong_jwt_secret_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// Register new user
router.post('/register', [
  body('username').isString().isLength({ min: 3, max: 100 }).trim(),
  body('password').isString().isLength({ min: 6, max: 200 }),
  body('nama_lengkap').optional().isString().isLength({ max: 200 }),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password, nama_lengkap, email } = req.body;

    // check existing
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (rows.length > 0) return res.status(409).json({ error: 'Username sudah digunakan.' });

    const pwdHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const role = (username === ADMIN_USERNAME) ? 'admin' : 'user';

    await pool.query('INSERT INTO users (username, password_hash, nama_lengkap, email, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, TRUE, NOW())', [username, pwdHash, nama_lengkap || null, email || null, role]);

    res.status(201).json({ message: 'Registrasi berhasil. Silakan login.' });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi.' });

    const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = TRUE LIMIT 1', [username.trim()]);
    if (users.length === 0) {
      await new Promise(r => setTimeout(r, 200));
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Username atau password salah.' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const tokenPayload = { id: user.id, username: user.username, role: user.role, guru_id: user.guru_id || null };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { password_hash, ...safeUser } = user;
    res.json({ message: 'Login berhasil.', token, user: safeUser });
  } catch (error) {
    console.error('[AUTH] Error saat login:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, nama_lengkap, email, role, guru_id, foto_url, last_login FROM users WHERE id = ? AND is_active = TRUE LIMIT 1', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User tidak ditemukan atau sudah dinonaktifkan.' });
    res.json({ user: users[0] });
  } catch (error) {
    console.error('[AUTH] Error fetching current user:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    if (current_password === new_password) return res.status(400).json({ error: 'Password baru tidak boleh sama dengan password lama.' });

    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });

    const match = await bcrypt.compare(current_password, users[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Password lama tidak cocok.' });

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [newHash, req.user.id]);

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('[AUTH] Error changing password:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;
