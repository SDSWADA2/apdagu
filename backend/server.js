const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const pool = require('./config/db');
const SocketServer = require('./socket');

// Route imports
const authRoutes = require('./routes/auth');
const guruRoutes = require('./routes/guru');
const kepegawaianRoutes = require('./routes/kepegawaian');
const jadwalRoutes = require('./routes/jadwal');
const absensiRoutes = require('./routes/absensi');
const genericRoutes = require('./routes/generic');
const syncRoutes = require('./routes/sync');
const eventsModule = require('./routes/events');   // SSE Fallback

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
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "wss://*", "https://*"],
    }
  } : false,
}));

// CORS Configuration - Permissive for development & configurable for production
const rawAllowed = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawAllowed
  ? rawAllowed.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
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
app.use('/api/events', eventsModule.router);       // SSE Realtime Fallback

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
// Auto-Serve Frontend Single Page Application (SPA) & Static Assets
// ============================================================================
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath, {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  setHeaders: (res, path) => {
    // Jangan cache file index.html agar update PWA / frontend selalu terbaru
    if (path.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'REST API — Aplikasi Database Guru SD Negeri Sumber Waru 2',
    version: '1.3.0',
    status: 'online',
    environment: NODE_ENV,
    realtime: 'Socket.IO v4 — Active',
    endpoints: {
      auth: '/api/auth/login [POST], /api/auth/me [GET], /api/auth/change-password [POST]',
      guru: '/api/guru [GET, POST, PUT, DELETE]',
      kepegawaian: '/api/kepegawaian [GET, POST, PUT, DELETE]',
      jadwal: '/api/jadwal [GET, POST, PUT, DELETE]',
      absensi: '/api/absensi [GET, POST, PUT, DELETE, POST /batch]',
      data: '/api/data/:table [GET, POST, PUT, DELETE]',
      sync: '/api/sync/status [GET], /api/sync/all [GET, POST], /api/sync/changes [GET, POST]',
      socket: `ws://localhost:${PORT} (Socket.IO)`,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  const dbTest = typeof pool.testDbConnection === 'function'
    ? await pool.testDbConnection()
    : { connected: false, message: 'testDbConnection tidak tersedia', error: 'N/A' };

  const activeUsers = SocketServer.getActiveUsers ? SocketServer.getActiveUsers() : [];
  const socketStats = SocketServer.getStats ? SocketServer.getStats() : {};

  res.status(200).json({
    status   : 'success',
    message  : 'Server backend terhubung dengan baik',
    uptime   : Math.round(process.uptime()),
    database : dbTest.connected ? 'connected' : dbTest.error || 'disconnected',
    db_name  : dbTest.database  || null,
    db_host  : dbTest.host      || null,
    db_version: dbTest.version  || null,
    realtime : {
      websocket   : { status: 'active', engine: 'Socket.IO v4', activeUsers: activeUsers.length },
      sse_fallback: { status: 'active', clients: eventsModule.getClientCount() },
      stats       : socketStats,
    },
    timestamp: new Date().toISOString(),
  });
});

// Fallback SPA routing for browser navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================================================
// 404 Handler for API
// ============================================================================
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `Endpoint API tidak ditemukan: ${req.method} ${req.path}`,
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

// ============================================================================
// HTTP Server + Socket.IO — Wajib pakai http.createServer agar WebSocket bisa
// ============================================================================
const httpServer = http.createServer(app);

// Inisialisasi Socket.IO Realtime Engine
SocketServer.init(httpServer, allowedOrigins);

// Hubungkan SSE module ke SocketServer agar bisa query stats
eventsModule.attachSocketServer(SocketServer);

// Export httpServer untuk testing
module.exports = { app, httpServer };

if (require.main === module) {
  httpServer.listen(PORT, async () => {
    console.log('============================================================');
    console.log(`  🏫  Aplikasi Database Guru SD Negeri Sumber Waru 2`);
    console.log(`  🚀  Server & Web App berjalan di : http://localhost:${PORT}`);
    console.log(`  🌍  Environment                  : ${NODE_ENV}`);
    console.log(`  📡  Realtime Engine              : Socket.IO v4 Active`);
    console.log(`  📅  Waktu Start                  : ${new Date().toLocaleString('id-ID')}`);

    if (typeof pool.testDbConnection === 'function') {
      const dbTest = await pool.testDbConnection();
      if (dbTest.connected) {
        console.log(`  🗄️   Database PostgreSQL           : Terhubung ke \`${dbTest.database}\` (${dbTest.version})`);
        
        // Auto-initialize tables if empty (PostgreSQL syntax)
        try {
          const { rows: tableRows } = await pool.query(
            `SELECT COUNT(*) AS count FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
            ['users']
          );
          const tableCount = parseInt(tableRows[0]?.count || '0');

          if (tableCount === 0) {
            console.log('  ⚙️   Inisialisasi otomatis skema & akun demo...');
            const setupDatabase = require('./scripts/setup_db');
            await setupDatabase();
          }
        } catch (initErr) {
          console.warn('  ⚠️   Pengecekan otomatis skema dilewati:', initErr.message);
        }
      } else {
        console.log(`  ⚠️   Database PostgreSQL           : ${dbTest.message}`);
        console.log(`  💡  Petunjuk                     : Aplikasi otomatis berjalan dalam mode Offline-First`);
      }
    }
    console.log('============================================================');
  });

  // ============================================================================
  // Graceful Shutdown
  // ============================================================================
  const gracefulShutdown = () => {
    console.log('\n[SERVER] Menerima sinyal untuk mematikan server. Memulai graceful shutdown...');
    
    // Matikan HTTP Server (berhenti menerima request baru)
    httpServer.close(async (err) => {
      if (err) {
        console.error('[SERVER] Error saat mematikan HTTP server:', err);
        process.exit(1);
      }
      console.log('[SERVER] HTTP server ditutup.');
      
      // Matikan koneksi database jika pool.end() tersedia
      try {
        if (typeof pool.end === 'function') {
          await pool.end();
          console.log('[SERVER] Koneksi database ditutup.');
        }
      } catch (dbErr) {
        console.error('[SERVER] Error saat mematikan koneksi database:', dbErr);
      }

      console.log('[SERVER] Graceful shutdown selesai. Keluar dari proses.');
      process.exit(0);
    });

    // Paksa mati jika graceful shutdown terlalu lama (>10 detik)
    setTimeout(() => {
      console.error('[SERVER] Terlalu lama untuk shutdown, mematikan secara paksa (force exit).');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

