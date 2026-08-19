const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const rateLimit = require('express-rate-limit');
// bodyParser is not needed as we use express.json and express.urlencoded
// const bodyParser = require('body-parser');
const pool = require('./config/db');

// Route imports
const guruRoutes = require('./routes/guru');
const kepegawaianRoutes = require('./routes/kepegawaian');
const jadwalRoutes = require('./routes/jadwal');
const genericRoutes = require('./routes/generic');
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');

// Middleware
const authMiddleware = require('./middleware/auth');

// Swagger / OpenAPI (optional)
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet: Security HTTP headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Diperlukan untuk frontend yang load dari file
  contentSecurityPolicy: false,     // Dikelola di frontend
}));

// CORS Configuration - read allowed origins from ENV (CSV) with a development fallback
const rawAllowed = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawAllowed
  ? rawAllowed.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'http://localhost:5500',   // Live Server VSCode
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'null',                    // file:// protocol (untuk buka HTML langsung)
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (Postman, curl) atau dari origin yang diizinkan
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin "${origin}" tidak diizinkan.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================================
// Rate Limiting
// ============================================================================

// Rate limiter global: 100 request per 15 menit per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi dalam 15 menit.' },
});

// Rate limiter ketat untuk endpoint login: 10 percobaan per 5 menit
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 5 menit.' },
  skipSuccessfulRequests: true, // Hanya hitung request gagal
});

app.use(globalLimiter);

// ============================================================================
// Body Parsing Middleware
// ============================================================================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan('combined'));

// ============================================================================
// Request Logging (Development Only)
// ============================================================================
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// API Routes
// ============================================================================

// Auth: rate limit ketat hanya di endpoint login
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/kepegawaian', kepegawaianRoutes);
app.use('/api/data', genericRoutes);

// Sync endpoints: protected by authMiddleware
app.use('/api/sync', authMiddleware, syncRoutes);

// ============================================================================
// Swagger UI (optional, disabled in production)
// ============================================================================
let swaggerDocument = null;
try {
  const swaggerPath = path.join(__dirname, 'openapi.yaml');
  swaggerDocument = YAML.load(swaggerPath);
} catch (err) {
  console.warn('Gagal memuat openapi.yaml untuk Swagger UI:', err.message);
}

const enableSwaggerUI = (process.env.SWAGGER_UI !== 'false' && NODE_ENV !== 'production');
if (swaggerDocument && enableSwaggerUI) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
  console.log('Swagger UI tersedia di /api/docs');
} else {
  console.log('Swagger UI dinonaktifkan (SWAGGER_UI=false atau NODE_ENV=production) atau openapi.yaml tidak ditemukan.');
}

// ============================================================================
// Root Route — Informasi API
// ============================================================================
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
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

  // CORS error
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ error: err.message, code: 'CORS_ERROR' });
  }

  // JSON parse error
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

// ============================================================================
// Start Server
// ============================================================================
// Export the app for testing or external usage
module.exports = app;

// Start server only when executed directly
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
