import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDb, getDb } from './database/db';
import { initWhatsApp, getWhatsAppStatus } from './services/wa.service';
import { startCronService } from './services/cron.service';

// Route imports
import authRoutes from './routes/auth.routes';
import leadsRoutes from './routes/leads.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import analyticsRoutes from './routes/analytics.routes';

dotenv.config();

// ── 1. Validate Environment Variables on Startup ───────────────────────────
function validateEnv() {
  const requiredEnv = ['JWT_SECRET', 'PORT'];
  const missing = requiredEnv.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Critical Startup Error: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY') {
    console.warn('⚠️ Startup Warning: GEMINI_API_KEY is not configured or using default template value. Lead qualifying will fall back to mock AI.');
  }

  const port = Number(process.env.PORT);
  if (isNaN(port) || port <= 0 || port > 65535) {
    console.error(`❌ Critical Startup Error: Invalid PORT specified: ${process.env.PORT}`);
    process.exit(1);
  }
}

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic production CORS validation rules
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://trinetradigitalsolution.com',
  'https://www.trinetradigitalsolution.com'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow same-origin requests (e.g. mobile apps, curl, or same-domain requests without Origin header)
    if (!origin) return callback(null, true);
    
    // Check if origin is explicitly allowed or is a subdomain of our target production platform
    if (
      allowedOrigins.includes(origin) || 
      origin.endsWith('.trinetradigitalsolution.com')
    ) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ [SECURITY] Blocked cross-origin request from: ${origin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log basic requests in clean format
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/analytics', analyticsRoutes);

// Expose health status for VPS monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ── 2. Expose Advanced /api/health Endpoint with Stats ──────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const db = getDb();
    await db.get('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  let waStatus = 'disconnected';
  try {
    const wa = getWhatsAppStatus();
    waStatus = wa.status;
  } catch (err) {
    waStatus = 'error';
  }

  const mem = process.memoryUsage();
  const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  res.json({
    status: 'ok',
    db: dbStatus,
    whatsapp: waStatus,
    system: {
      uptime: `${Math.floor(process.uptime())}s`,
      ramUsed: formatMB(mem.heapUsed),
      ramAllocated: formatMB(mem.rss)
    },
    timestamp: new Date().toISOString()
  });
});

// Serving production build static frontend assets directly if compiled
const clientBuildPath = path.resolve(__dirname, '../../dist');
if (fs.existsSync(clientBuildPath)) {
  console.log(`📁 Bundled client assets found at: ${clientBuildPath}. Binding web server gateway.`);
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.log('💡 Run "npm run build" in frontend workspace to serve client files directly from this server.');
}

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Server unhandled exception:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function main() {
  try {
    // 1. Initialize SQLite Database
    await initDb();

    // 2. Start Cron Service for automated follow-ups
    startCronService();

    // 3. Start Web Server
    app.listen(PORT, () => {
      console.log(`🚀 Trinetra API automation backend running live on port ${PORT}`);
    });

    // 4. Initialize WhatsApp connection (runs asynchronously in background)
    await initWhatsApp();

  } catch (error) {
    console.error('❌ Critical system startup failure:', error);
    process.exit(1);
  }
}

// ── 3. Graceful Shutdown Handlers ──────────────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Graceful shutdown signal received (${signal}). Terminating services...`);
  
  try {
    const db = getDb();
    if (db) {
      await db.close();
      console.log('💾 SQLite database connection closed safely.');
    }
  } catch (err) {
    console.error('⚠️ Error closing database:', err);
  }

  console.log('🔌 Flushing active WhatsApp session credentials state to disk...');
  setTimeout(() => {
    console.log('👋 Clean shutdown completed. Exiting process.');
    process.exit(0);
  }, 1500);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

main();
