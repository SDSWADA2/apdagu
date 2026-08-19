const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

module.exports = function (req, res, next) {
  // Allow skipping auth in development with env var SKIP_AUTH=true
  if (process.env.SKIP_AUTH === 'true' && (process.env.NODE_ENV || 'development') === 'development') {
    req.user = { username: 'dev', role: 'admin' };
    return next();
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid Authorization header format' });

  const scheme = parts[0];
  const token = parts[1];
  if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ error: 'Malformed Authorization header' });

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.warn('Auth middleware - token verify failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
