const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'please_set_a_strong_jwt_secret_in_production';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Akses ditolak. Token tidak ditemukan.',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Token tidak valid.', code: 'INVALID_TOKEN' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Akses ditolak. Halaman ini hanya untuk: ${roles.join(', ')}.`, code: 'INSUFFICIENT_ROLE' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
