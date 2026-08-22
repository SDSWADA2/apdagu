const jwt = require('jsonwebtoken');

const DEFAULT_SECRET = 'super_secret_key_sdn_sumber_waru_2_2026';
let JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

// Mencegah penggunaan secret default di lingkungan production demi keamanan
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET tidak diatur dengan aman di environment variables pada mode production!');
    console.error('Silakan atur JWT_SECRET di file .env Anda dengan string acak (misal: openssl rand -base64 48).');
    process.exit(1);
  }
}
/**
 * Middleware untuk memverifikasi JWT token pada header Authorization
 */
function verifyToken(req, res, next) {
  // Opsi skip auth untuk testing lokal jika SKIP_AUTH=true
  if (process.env.SKIP_AUTH === 'true' && (process.env.NODE_ENV || 'development') === 'development') {
    req.user = { id: 1, username: 'admin', role: 'admin' };
    return next();
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.', code: 'UNAUTHORIZED' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return res.status(401).json({ error: 'Format header Authorization tidak valid. Gunakan format: Bearer <token>', code: 'INVALID_HEADER' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesi login telah kedaluwarsa. Silakan login ulang.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token autentikasi tidak valid.', code: 'INVALID_TOKEN' });
  }
}

/**
 * Middleware Role-Based Access Control (RBAC)
 * Contoh penggunaan: requireRole('admin', 'operator')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Pengguna belum terautentikasi.', code: 'UNAUTHORIZED' });
    }
    
    const userRole = (req.user.role || '').toLowerCase();
    const hasRole = allowedRoles.map(r => r.toLowerCase()).includes(userRole);

    if (!hasRole) {
      return res.status(403).json({
        error: `Akses ditolak. Peran "${req.user.role}" tidak memiliki izin untuk tindakan ini.`,
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
module.exports.requireRole = requireRole;
module.exports.authMiddleware = verifyToken;
module.exports.JWT_SECRET = JWT_SECRET;
