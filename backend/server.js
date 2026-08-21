const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const guruRoutes = require('./routes/guru');
const kepegawaianRoutes = require('./routes/kepegawaian');
const jadwalRoutes = require('./routes/jadwal');
const absensiRoutes = require('./routes/absensi');
const genericRoutes = require('./routes/generic');
const syncRoutes = require('./routes/sync');

// Swagger / OpenAPI (optional)
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Security Middleware
// ============================================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS Configuration - Permissive for development & configurable for production
const rawAllowed = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawAllowed
  ? rawAllowed.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'null',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Di mode development atau jika origin ada di daftar / direct file / curl / postman
    if (!origin || allowedOrigins.includes(origin) || NODE_ENV === 'development' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin "${origin}" tidak diizinkan.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Handle preflight OPTIONS explicitly
app.options('*', cors());

// ============================================================================
// Body Parsing Middleware
// ============================================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
} else {
  app.use(morgan('combined'));
}

// ============================================================================
// Rate Limiting
// ============================================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Longgar untuk penggunaan aplikasi SPA
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi dalam 15 menit.', code: 'RATE_LIMITED' },
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 5 menit.', code: 'LOGIN_RATE_LIMITED' },
  skipSuccessfulRequests: true,
});

app.use('/api', globalLimiter);

// ============================================================================
// API Routes
// ============================================================================
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/kepegawaian', kepegawaianRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/data', genericRoutes);
app.use('/api/sync', syncRoutes);

// ============================================================================
// Swagger UI (optional)
// ============================================================================
try {
  const swaggerPath = path.join(__dirname, 'openapi.yaml');
  const swaggerDocument = YAML.load(swaggerPath);
  if (swaggerDocument) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
  }
} catch (err) {
  // Abaikan jika openapi.yaml tidak ada
}

// ============================================================================
// Root & Healthcheck Endpoints
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    message: 'REST API — Aplikasi Database Guru SD Negeri Sumber Waru 2',
    version: '1.2.0',
    status: 'online',
    environment: NODE_ENV,
    endpoints: {
      auth: '/api/auth/login [POST], /api/auth/me [GET], /api/auth/change-password [POST]',
      guru: '/api/guru [GET, POST, PUT, DELETE]',
      kepegawaian: '/api/kepegawaian [GET, POST, PUT, DELETE]',
      jadwal: '/api/jadwal [GET, POST, PUT, DELETE]',
      absensi: '/api/absensi [GET, POST, PUT, DELETE, POST /batch]',
      data: '/api/data/:table [GET, POST, PUT, DELETE]',
      sync: '/api/sync/status [GET], /api/sync/all [GET, POST], /api/sync/changes [GET, POST]'
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS test');
    if (result && result[0].test === 2) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.status(200).json({ 
    status: 'success', 
    message: 'Server backend terhubung dengan baik',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 404 Handler
// ============================================================================
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint tidak ditemukan: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
});

// ============================================================================
// Global Error Handler
// ============================================================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message || err);

  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: err.message, code: 'CORS_ERROR' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format JSON tidak valid.', code: 'INVALID_JSON' });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: NODE_ENV === 'production'
      ? 'Terjadi kesalahan internal pada server.'
      : (err.message || 'Terjadi kesalahan internal pada server.'),
    code: err.code || 'INTERNAL_SERVER_ERROR',
  });
});

// Export app for testing or external usage
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('============================================================');
    console.log(`  🏫  API Database Guru SD Negeri Sumber Waru 2`);
    console.log(`  🚀  Server berjalan di : http://localhost:${PORT}`);
    console.log(`  🌍  Environment        : ${NODE_ENV}`);
    console.log(`  📅  Waktu Start        : ${new Date().toLocaleString('id-ID')}`);
    console.log('============================================================');
  });
}
