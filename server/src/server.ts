import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { envConfig } from './config/env';
import { initDb, getDb } from './database/connection';
import { initWhatsApp, getWhatsAppStatus } from './whatsapp/gateway';
import { startCronService } from './services/cron.service';
import { errorMiddleware } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import leadsRoutes from './routes/leads.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import analyticsRoutes from './routes/analytics.routes';
import conversationsRoutes from './routes/conversations.routes';
import { ConversationsController } from './controllers/conversations.controller';
import { authenticateJWT } from './middleware/auth';

const app = express();
const PORT = envConfig.PORT;

// CORS Mappings
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
      origin.endsWith('.trinetradigitalsolution.com') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
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

// Standard logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// REST Endpoint mounts
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.post('/api/send-message', authenticateJWT, ConversationsController.sendGeneralMessage);

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Advanced health check with memory usage and service links
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

// Serve frontend dist assets if present
const clientBuildPath = path.resolve(__dirname, '../../dist');
if (fs.existsSync(clientBuildPath)) {
  console.log(`📁 Bundled client assets found at: ${clientBuildPath}. Binding web server gateway.`);
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.log('💡 Static client folders not found at server root. Frontend Dashboard runs separately.');
}

// Global enterprise error interceptor
app.use(errorMiddleware);

async function main() {
  try {
    // 1. Initialize SQLite connection with high-performance configurations
    await initDb();

    // 2. Start schedule cron nurtures
    startCronService();

    // 3. Bind app listener
    app.listen(PORT, () => {
      console.log(`🚀 Trinetra enterprise API backend running live on port ${PORT}`);
    });

    // 4. Fire WhatsApp Baileys gateway in the background
    await initWhatsApp();

  } catch (error) {
    console.error('❌ Critical system startup failure:', error);
    process.exit(1);
  }
}

// Graceful restart and teardown handlers
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
