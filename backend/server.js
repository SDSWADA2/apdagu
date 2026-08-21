const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');

const guruRoutes = require('./routes/guru');
const kepegawaianRoutes = require('./routes/kepegawaian');
const jadwalRoutes = require('./routes/jadwal');
const genericRoutes = require('./routes/generic');
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');
const authMiddleware = require('./middleware/auth');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}

if (NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error('ALLOWED_ORIGINS must be configured in production.');
}

app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

const rawAllowed = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawAllowed
  ? rawAllowed.split(',').map(origin => origin.trim()).filter(Boolean)
  : [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser clients such as health checks/curl do not send Origin.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin "${origin}" tidak diizinkan.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi dalam 15 menit.' },
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 5 menit.' },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/kepegawaian', kepegawaianRoutes);
app.use('/api/data', genericRoutes);
app.use('/api/sync', authMiddleware, syncRoutes);

let swaggerDocument = null;
try {
  const swaggerPath = path.join(__dirname, 'openapi.yaml');
  swaggerDocument = YAML.load(swaggerPath);
} catch (err) {
  console.warn('Gagal memuat openapi.yaml untuk Swagger UI:', err.message);
}

const enableSwaggerUI = process.env.SWAGGER_UI === 'true' && NODE_ENV !== 'production';
if (swaggerDocument && enableSwaggerUI) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
}

app.get('/', (req, res) => {
  res.json({
    message: 'REST API — Aplikasi Database Guru SD Negeri Sumber Waru 2',
    version: '1.1.0',
    status: 'running',
    environment: NODE_ENV,
    endpoints: {
      auth: '/api/auth/login [POST]',
      guru: '/api/guru [GET, POST, PUT, DELETE]',
      kepegawaian: '/api/kepegawaian [GET, POST, PUT, DELETE]',
      data: '/api/data/:table [GET, POST, PUT, DELETE]',
      sync: '/api/sync/changes [POST, GET]'
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'ok', uptime: process.uptime() });
  } catch (error) {
    console.error('[HEALTH] Database check failed:', error.message);
    return res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint tidak ditemukan: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message || err);

  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: 'Origin tidak diizinkan.', code: 'CORS_ERROR' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format JSON tidak valid.', code: 'INVALID_JSON' });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: NODE_ENV === 'production'
      ? 'Terjadi kesalahan internal pada server.'
      : (err.message || 'Terjadi kesalahan internal pada server.'),
    code: err.code || 'INTERNAL_SERVER_ERROR',
  });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API Database Guru SD Negeri Sumber Waru 2 berjalan pada port ${PORT} (${NODE_ENV}).`);
  });
}
