/**
 * JWT authentication middleware.
 *
 * The same module exports both verifyToken and requireRole because all
 * protected API routes consume those named exports.
 */
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return secret || 'dev-only-jwt-secret-change-me';
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Akses ditolak. Token tidak ditemukan.',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({
      error: 'Akses ditolak. Token tidak ditemukan.',
      code: 'NO_TOKEN'
    });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sesi Anda telah berakhir. Silakan login kembali.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      error: 'Token tidak valid.',
      code: 'INVALID_TOKEN'
    });
  }
};

const requireRole = (...roles) => {
  const normalizedRoles = roles.map(role => String(role).toLowerCase());

  return (req, res, next) => {
    const userRole = req.user && String(req.user.role || '').toLowerCase();

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Akses ditolak. Halaman ini hanya untuk: ${roles.join(', ')}.`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    return next();
  };
};

module.exports = { verifyToken, requireRole };
