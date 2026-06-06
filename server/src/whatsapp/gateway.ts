import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  proto,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { getDb, logAuditAction } from '../database/connection';
import { envConfig } from '../config/env';
import { processInboundMessage } from '../services/conversation.service';
import { LeadModel } from '../models/lead.model';
import { MessageModel, ConversationModel } from '../models/message.model';
import { scheduleNurtureSequence } from '../services/cron.service';
import { getActiveAiProvider } from '../services/openrouter.service';

// ─── Opt-out detection — Meta compliance requirement ───────────────────────────────────────────
const OPT_OUT_PATTERN = /^(STOP|CANCEL|UNSUBSCRIBE|BAND KARO|NAHI CHAHIYE|NAI CHAHIYE|ROKEIN|BAND KRO|OPT.?OUT)$/i;

// ─── Immediate human-request patterns (no AI round-trip needed) ────────────────────
const HUMAN_REQUEST_PATTERN = /\b(insaan chahiye|real person|actual person|talk to (a |an )?human|talk to (a |an )?person|speak to (a |an )?(human|person|agent|someone)|connect me to|human agent|team se baat|baat karni hai|agent chahiye|koi insaan|manager se baat|owner se baat|sales team|expert se baat|consultant chahiye|call me|call karo|call back|call kar|mujhe call)\b/i;

// ─── WhatsApp numbered menu responses ───────────────────────────────────────────────────
const MENU_RESPONSE: Record<string, string> = {
  MAIN: `🏢 *TRINETRA DIGITAL SOLUTION*
Your Business Automation & Digital Growth Partner

────────────────────────
Reply karo number se:

1️⃣ Website Development
2️⃣ WhatsApp Automation
3️⃣ AI Chatbot & CRM System
4️⃣ Digital Marketing & SEO
5️⃣ Packages & Pricing
6️⃣ Free Consultation Book Karein
7️⃣ Team Se Baat Karein
────────────────────────
🌐 trinetradigitalsolution.com
📞 +91 9334757759`,

  '1': `💻 *WEBSITE DEVELOPMENT*

Hum build karte hain:
• Business Websites (₹7,999 – ₹35,000)
• Premium Websites (₹35,000 – ₹75,000+)
• E-Commerce Stores (₹25,000 – ₹1,50,000+)
• Landing Pages & Lead Funnels
• Mobile Responsive Design
• SEO-Ready Structure

*Final pricing scope ke hisab se vary kar sakti hai.*

Aap kis type ka business run karte hain? Main aapke liye best option suggest karunga 😊`,

  '2': `📱 *WHATSAPP AUTOMATION*

Hum automate karte hain:
• Auto-replies & Welcome Messages
• Lead Capture & Contact Management
• Follow-up Automation (Day 1/3/7/14)
• Missed Lead Recovery
• CRM Integration
• Broadcast Management

Packages:
🟢 Launch: ₹7,999 setup + ₹1,499/month
🟡 Growth: ₹14,999 setup + ₹3,999/month
🔴 AI Sales: ₹29,999+ setup + ₹7,999+/month

*Final pricing scope ke hisab se vary kar sakti hai.*

Abhi aap WhatsApp par daily kitni inquiries handle karte hain?`,

  '3': `🤖 *AI CHATBOT & CRM SYSTEM*

Hum provide karte hain:
• AI-Powered WhatsApp Chatbot
• Lead Qualification & Scoring
• CRM Dashboard & Pipeline
• Appointment Booking
• Smart Follow-up Automation
• Team Assignment & Routing

AI Sales System: ₹29,999 – ₹75,000 setup + ₹7,999 – ₹24,999/month
Custom CRM: ₹50,000 – ₹3,00,000+ setup

*Final pricing scope ke hisab se vary kar sakti hai.*

Aapki team abhi leads ko Excel, WhatsApp ya kisi CRM mein manage karti hai?`,

  '4': `📈 *DIGITAL MARKETING & SEO*

Hum handle karte hain:
• Social Media Marketing
• Lead Generation Campaigns
• Google Business Profile Optimization
• SEO (Local / Business / Advanced)
• Content Planning & Scheduling

Pricing:
🔵 Local SEO: ₹5,000/month
🔵 Business SEO: ₹10,000/month
🔵 Marketing Starter: ₹5,000/month
🔵 Marketing Growth: ₹10,000/month

*Ad spend alag se hoga. Final pricing vary kar sakti hai.*

Aapka business kis city ko target karta hai?`,

  '5': `📊 *PACKAGES & PRICING OVERVIEW*

🟢 *Launch Package*
Setup: ₹7,999 | Monthly: ₹1,499
Best for: Small businesses, shops

🟡 *Growth Package*
Setup: ₹14,999 | Monthly: ₹3,999
Best for: Clinics, coaching, agencies

🔴 *AI Sales System*
Setup: ₹29,999–₹75,000 | Monthly: ₹7,999–₹24,999
Best for: Real estate, education, high volume

⚫ *Custom CRM / SaaS*
Setup: ₹50,000–₹3,00,000+ | Monthly: varies
Best for: Enterprise, internal software

*Final pricing scope aur customization ke hisab se vary kar sakti hai.*

Kaunsa package aapke business ke liye suitable lagta hai? Main help karunga 😊`,

  '6': `📅 *FREE CONSULTATION BOOK KAREIN*

Hamari team se ek free 15-minute consultation schedule karein.

Aap seedhe chat par details share kar sakte hain:
1️⃣ Preferred date (kal / parso / specific date)
2️⃣ Preferred time (e.g. 2 PM, 4 PM)

Main instant aapki appointment book kar dunga! 😊

📞 +91 9334757759
📧 info@trinetradigitalsolution.com`,

  '7': `👤 *TEAM SE CONNECT KAREIN*

Hamari team aapki detail se help karne ke liye available hai.

📞 WhatsApp / Call: +91 9334757759
📧 Email: info@trinetradigitalsolution.com
🌐 Website: https://trinetradigitalsolution.com

Main abhi aapki inquiry hamare senior consultant tak forward kar raha hoon. Wo aapko jaldi connect karenge.`,
};

const resolvedSessionPath = path.resolve(process.cwd(), envConfig.WHATSAPP_SESSION_PATH);

// Ensure the directory exists
if (!fs.existsSync(resolvedSessionPath)) {
  fs.mkdirSync(resolvedSessionPath, { recursive: true });
}

let sock: WASocket | null = null;
let connectionStatus: 'connected' | 'connecting' | 'qr_required' | 'logged_out' | 'auth_failed' | 'intervention_required' | 'disconnected' = 'disconnected';
let latestQr: string | null = null;
let latestQrImage: string | null = null;
let disconnectReason: string | null = null;
let reconnectTimestamps: number[] = [];
let connectedAt: number | null = null;

// Reconnection backoff variables
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
const MAX_RECONNECT_ATTEMPTS = 15;

interface QueuedMessage {
  id: string;
  leadId: string;
  phone: string;
  text: string;
  overrideJid?: string;
  attempts: number;
}

const outboundQueue: QueuedMessage[] = [];
let isProcessingQueue = false;
let failedQueueCount = 0;
let lastInboundTime: string | null = null;
let lastOutboundTime: string | null = null;
let lastDeliveryTime: string | null = null;
let reconnectCount = 0;

// Clean logger to suppress Baileys verbose output
const logger = pino({ level: 'silent' });

const backupsPath = path.resolve(process.cwd(), 'whatsapp-session-backups');

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function backupSessionFolder(reason: string): Promise<string | null> {
  try {
    if (!fs.existsSync(resolvedSessionPath)) return null;
    
    const credsPath = path.join(resolvedSessionPath, 'creds.json');
    if (!fs.existsSync(credsPath)) {
      console.log('ℹ️ [BACKUP] No credentials to backup.');
      return null;
    }

    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDirName = `session-backup-${timestamp}`;
    const backupDest = path.join(backupsPath, backupDirName);

    console.log(`💾 [BACKUP] Backing up session credentials to ${backupDest}. Reason: ${reason}`);
    copyDirSync(resolvedSessionPath, backupDest);

    fs.writeFileSync(path.join(backupDest, 'backup-info.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      reason,
      connectionStatus
    }, null, 2));

    await logAuditAction('WHATSAPP_SESSION_BACKUP', `Created backup ${backupDirName}. Reason: ${reason}`);

    pruneBackups();
    return backupDest;
  } catch (err) {
    console.error('❌ [BACKUP] Error creating session backup:', err);
    return null;
  }
}

function pruneBackups() {
  try {
    if (!fs.existsSync(backupsPath)) return;
    const entries = fs.readdirSync(backupsPath, { withFileTypes: true });
    const backupDirs = entries
      .filter(e => e.isDirectory() && e.name.startsWith('session-backup-'))
      .map(e => ({
        name: e.name,
        path: path.join(backupsPath, e.name),
        mtime: fs.statSync(path.join(backupsPath, e.name)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backupDirs.length > 3) {
      const toDelete = backupDirs.slice(3);
      for (const dir of toDelete) {
        console.log(`🗑️ [BACKUP] Pruning old backup: ${dir.name}`);
        fs.rmSync(dir.path, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error('❌ [BACKUP] Error pruning backups:', err);
  }
}

export async function restoreSessionBackup(backupDirName: string): Promise<boolean> {
  try {
    const backupSource = path.join(backupsPath, backupDirName);
    if (!fs.existsSync(backupSource)) {
      console.error(`❌ [ROLLBACK] Backup ${backupDirName} does not exist.`);
      return false;
    }

    console.log(`🔄 [ROLLBACK] Restoring session backup from: ${backupDirName}`);
    
    if (sock) {
      try {
        sock.end(undefined);
      } catch (err) {}
      sock = null;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    await backupSessionFolder(`pre-rollback-restore-of-${backupDirName}`);

    try {
      fs.rmSync(resolvedSessionPath, { recursive: true, force: true });
    } catch (err) {
      console.warn('⚠️ [ROLLBACK] Non-fatal error cleaning session folder before restore:', err);
    }
    fs.mkdirSync(resolvedSessionPath, { recursive: true });

    copyDirSync(backupSource, resolvedSessionPath);

    const infoPath = path.join(resolvedSessionPath, 'backup-info.json');
    if (fs.existsSync(infoPath)) {
      fs.unlinkSync(infoPath);
    }

    await logAuditAction('WHATSAPP_SESSION_RESTORE', `Restored backup: ${backupDirName}`);
    console.log('🟢 [ROLLBACK] Session files restored. Re-initializing gateway...');
    
    reconnectAttempts = 0;
    connectionStatus = 'disconnected';
    latestQr = null;
    latestQrImage = null;
    disconnectReason = null;

    await initWhatsApp();
    return true;
  } catch (err) {
    console.error('❌ [ROLLBACK] Failed to restore session backup:', err);
    return false;
  }
}

export function listSessionBackups() {
  try {
    if (!fs.existsSync(backupsPath)) return [];
    const entries = fs.readdirSync(backupsPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && e.name.startsWith('session-backup-'))
      .map(e => {
        const dirPath = path.join(backupsPath, e.name);
        const infoPath = path.join(dirPath, 'backup-info.json');
        let info: any = {};
        if (fs.existsSync(infoPath)) {
          try {
            info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
          } catch (err) {}
        }
        return {
          name: e.name,
          timestamp: info.timestamp || fs.statSync(dirPath).mtime,
          reason: info.reason || 'Unknown',
          connectionStatus: info.connectionStatus || 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('❌ [BACKUP] Error listing backups:', err);
    return [];
  }
}

export function calculateHealthScore(status: string): number {
  if (status === 'qr_required' || status === 'logged_out' || status === 'auth_failed' || status === 'disconnected') {
    return 0;
  }
  if (status === 'intervention_required') {
    return 10;
  }
  
  let score = 100;
  
  score -= reconnectAttempts * 5;
  
  if (failedQueueCount > 0) {
    score -= Math.min(failedQueueCount * 10, 30);
  }
  
  const pendingCount = outboundQueue.length;
  if (pendingCount > 0) {
    score -= Math.min(pendingCount * 5, 20);
  }
  
  if (lastOutboundTime) {
    const lastOutboundTs = new Date(lastOutboundTime).getTime();
    const lastDeliveryTs = lastDeliveryTime ? new Date(lastDeliveryTime).getTime() : 0;
    
    if (lastOutboundTs > lastDeliveryTs) {
      const timeSinceOutbound = Date.now() - lastOutboundTs;
      if (timeSinceOutbound > 3600000) {
        score -= 25;
      }
    }
  }

  if (status === 'connecting') {
    score = Math.min(score, 75);
  }
  
  return Math.max(0, Math.min(100, score));
}

export async function restartWhatsApp(): Promise<void> {
  console.log('🔄 Restarting WhatsApp Gateway...');
  await logAuditAction('WHATSAPP_RESTART', 'Manual/automatic restart of the WhatsApp gateway initiated.');

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (sock) {
    try {
      sock.end(undefined);
    } catch (err) {
      console.error('⚠️ Error closing existing WhatsApp socket:', err);
    }
    sock = null;
  }

  connectionStatus = 'disconnected';
  latestQr = null;
  latestQrImage = null;
  reconnectAttempts = 0;
  reconnectTimestamps = []; // reset timestamps to recover from rate limiting

  await initWhatsApp();
}

function getReconnectDelay(statusCode?: number): number {
  if (statusCode === DisconnectReason.restartRequired) {
    console.log('🔄 Restart required by server. Reconnecting instantly (1s)...');
    return 1000;
  }
  const delays = [30000, 60000, 120000, 300000, 600000]; // 30s, 60s, 120s, 300s, 600s
  const attemptIndex = Math.min(reconnectAttempts, delays.length - 1);
  return delays[attemptIndex];
}

export async function initWhatsApp() {
  if (sock) return;

  console.log('🔄 Initializing WhatsApp Bot gateway (Baileys)...');
  connectionStatus = 'connecting';

  // Startup Validation
  const credsPath = path.join(resolvedSessionPath, 'creds.json');
  let credentialsExist = false;
  let credentialsValid = false;

  if (fs.existsSync(credsPath)) {
    credentialsExist = true;
    try {
      const content = fs.readFileSync(credsPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && (parsed.noiseKey || parsed.registrationId || parsed.creds)) {
        credentialsValid = true;
        console.log('🟢 [STARTUP] Valid WhatsApp credentials found. Auto-connecting...');
      }
    } catch (err) {
      console.warn('⚠️ [STARTUP] WhatsApp credentials file is invalid or corrupted:', err);
    }
  } else {
    console.log('ℹ️ [STARTUP] No credentials found. First-time QR generation required.');
  }

  if (credentialsExist && !credentialsValid) {
    console.warn('🚨 [STARTUP] Invalid credentials file found. Backing up and clearing...');
    await backupSessionFolder('invalid_credentials_on_startup');
    try {
      fs.rmSync(resolvedSessionPath, { recursive: true, force: true });
      fs.mkdirSync(resolvedSessionPath, { recursive: true });
    } catch (cleanErr) {
      console.error('❌ Failed to clean session folder:', cleanErr);
    }
  }

  try {
    let version: [number, number, number] = [2, 3000, 1015841372]; // Stable fallback version
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      console.log(`ℹ️ Fetched latest WhatsApp Web version: v${version.join('.')}, isLatest: ${latest.isLatest}`);
    } catch (err) {
      console.warn('⚠️ Failed to fetch latest WhatsApp version, using stable fallback:', err);
    }

    const { state, saveCreds } = await useMultiFileAuthState(resolvedSessionPath);

    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      version,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000,
      syncFullHistory: false,
      logger
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('contacts.upsert', (contacts) => {
      if (!sock) return;
      if (!(sock as any).contacts) {
        (sock as any).contacts = {};
      }
      for (const contact of contacts) {
        if (!contact.id) continue;
        (sock as any).contacts[contact.id] = {
          ...(sock as any).contacts[contact.id],
          ...contact
        };
      }
      console.log(`[LIFECYCLE] Stage: CONNECTION_WATCHDOG | Contacts upserted. Cache size: ${Object.keys((sock as any).contacts).length}`);
    });

    sock.ev.on('contacts.update', (updates) => {
      if (!sock) return;
      if (!(sock as any).contacts) {
        (sock as any).contacts = {};
      }
      for (const update of updates) {
        if (!update.id) continue;
        if ((sock as any).contacts[update.id]) {
          (sock as any).contacts[update.id] = {
            ...(sock as any).contacts[update.id],
            ...update
          };
        } else {
          (sock as any).contacts[update.id] = update;
        }
      }
    });

    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        const key = update.key;
        if (!key.id || !key.remoteJid) continue;
        
        const status = update.update.status;
        if (status !== undefined && status !== null) {
          let statusText = 'sent';
          if (status === 2) {
            statusText = 'delivered';
            lastDeliveryTime = new Date().toISOString();
          } else if (status === 3 || status === 4) {
            statusText = 'read';
          } else if (status === 0 || status === 1) {
            statusText = 'sent';
          }
          
          const msg = await MessageModel.findById(key.id);
          if (msg) {
            await MessageModel.updateStatus(key.id, statusText);
            console.log(`[LIFECYCLE] Stage: DELIVERY_ACK | LeadID: ${msg.lead_id} | JID: ${key.remoteJid} | MsgID: ${key.id} | Status: ${statusText}`);
          }
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQr = qr;
        connectionStatus = 'qr_required';
        disconnectReason = 'qr_required: Scan QR code to authenticate';
        try {
          qrcodeTerminal.generate(qr, { small: true });
          latestQrImage = await QRCode.toDataURL(qr);
          console.log('✨ Base64 QR image updated successfully.');

          const { notifyWhatsAppDisconnect } = await import('../services/notification.service');
          await notifyWhatsAppDisconnect('QR code scan required for pairing', true, 'qr_required');
        } catch (qrErr) {
          console.error('⚠️ Error rendering or generating QR code:', qrErr);
        }
      }

      if (connection === 'close') {
        latestQr = null;
        latestQrImage = null;
        connectionStatus = 'disconnected';
        sock = null;
        connectedAt = null;

        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        console.log(`🔴 WhatsApp connection closed. Status Code: ${statusCode || 'Unknown'}, Error: ${error || 'Unknown'}`);

        let reasonMsg = 'Unknown disconnect';
        let isPermanent = false;
        let shouldReconnect = true;
        let shouldCleanSession = false;

        if (statusCode === DisconnectReason.loggedOut) {
          reasonMsg = 'logged_out: Device unlinked or logged out from phone';
          connectionStatus = 'logged_out';
          isPermanent = true;
          shouldReconnect = false;
          shouldCleanSession = true;
        } else if (statusCode === DisconnectReason.badSession) {
          reasonMsg = 'auth_failed: Bad session credentials';
          connectionStatus = 'auth_failed';
          isPermanent = true;
          shouldReconnect = true;
          shouldCleanSession = true;
        } else if (statusCode === DisconnectReason.connectionReplaced) {
          reasonMsg = 'session_replaced: Connection replaced by another active session';
          connectionStatus = 'connecting';
          shouldReconnect = true;
        } else if (statusCode === DisconnectReason.connectionClosed) {
          reasonMsg = 'connection_closed: Socket connection closed by server';
          connectionStatus = 'connecting';
          shouldReconnect = true;
        } else if (statusCode === DisconnectReason.connectionLost) {
          reasonMsg = 'connection_lost: Network connection lost';
          connectionStatus = 'connecting';
          shouldReconnect = true;
        } else if (statusCode === DisconnectReason.timedOut) {
          reasonMsg = 'timeout: Connection timed out';
          connectionStatus = 'connecting';
          shouldReconnect = true;
        } else if (statusCode === DisconnectReason.restartRequired) {
          reasonMsg = 'restart_required: Server requested restart';
          connectionStatus = 'connecting';
          shouldReconnect = true;
        } else if (statusCode === DisconnectReason.multideviceMismatch) {
          reasonMsg = 'multidevice_mismatch: Multi-device version mismatch';
          connectionStatus = 'auth_failed';
          isPermanent = true;
          shouldReconnect = false;
          shouldCleanSession = true;
        } else if (error) {
          reasonMsg = `error: ${error.message || 'socket error'}`;
          connectionStatus = 'connecting';
          shouldReconnect = true;
        }

        disconnectReason = reasonMsg;
        await logAuditAction('WHATSAPP_DISCONNECT', `Connection closed: code=${statusCode || 'unknown'}, reason=${reasonMsg}`);

        try {
          const { notifyWhatsAppDisconnect } = await import('../services/notification.service');
          await notifyWhatsAppDisconnect(reasonMsg, isPermanent, connectionStatus);
        } catch (alertErr) {
          console.error('⚠️ [GATEWAY] Failed to send disconnect alert:', alertErr);
        }

        if (shouldCleanSession) {
          try {
            await backupSessionFolder(reasonMsg);
            console.log(`🗑️ Erasing invalid session files at: ${resolvedSessionPath}`);
            fs.rmSync(resolvedSessionPath, { recursive: true, force: true });
            fs.mkdirSync(resolvedSessionPath, { recursive: true });
          } catch (cleanErr) {
            console.error('❌ Failed to clean session path:', cleanErr);
          }
        }

        if (shouldReconnect) {
          if (statusCode === DisconnectReason.restartRequired) {
            console.log('🔄 Reconnecting immediately (1s) due to restartRequired...');
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              initWhatsApp();
            }, 1000);
            return;
          }

          if (reconnectAttempts >= 5) {
            console.error(`🚨 [RECONNECT EXHAUSTED] Failed to reconnect after 5 attempts. Switching to qr_required and stopping reconnect loop.`);
            connectionStatus = 'qr_required';
            disconnectReason = 'rate_limited: Failed to reconnect after 5 attempts. Stopped auto-reconnection loop.';
            await logAuditAction('WHATSAPP_RATE_LIMITED', 'Gateway enters qr_required state due to exhausted reconnect attempts.');
            try {
              const { notifyWhatsAppDisconnect } = await import('../services/notification.service');
              await notifyWhatsAppDisconnect(disconnectReason, true, 'qr_required');
            } catch (err) {
              console.error('⚠️ Failed to notify admin:', err);
            }
            return; // Stop reconnecting
          }

          reconnectAttempts++;
          const delay = getReconnectDelay(statusCode);
          console.log(`🔄 Attempting automatic reconnection in ${delay / 1000}s (Attempt ${reconnectAttempts}/5)...`);

          const now = Date.now();
          reconnectTimestamps.push(now);
          reconnectTimestamps = reconnectTimestamps.filter(ts => now - ts < 900000); // 15 mins

          if (reconnectTimestamps.length > 5) {
            console.error(`🚨 [RESTART PROTECTION] Too many reconnect attempts (${reconnectTimestamps.length}) within 15 minutes. Stopping loop.`);
            connectionStatus = 'intervention_required';
            disconnectReason = 'rate_limited: Too many reconnect attempts within 15 minutes. Manual intervention required.';
            await logAuditAction('WHATSAPP_RATE_LIMITED', 'Gateway enters intervention_required state. Reconnect attempts throttled.');

            try {
              const { notifyWhatsAppDisconnect } = await import('../services/notification.service');
              await notifyWhatsAppDisconnect(disconnectReason, true, 'intervention_required');
            } catch (err) {
              console.error('⚠️ Failed to notify admin about rate-limiting:', err);
            }
            return; // Exit reconnect loop
          }

          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            initWhatsApp();
          }, delay);
        }
      } else if (connection === 'open') {
        latestQr = null;
        latestQrImage = null;
        connectionStatus = 'connected';
        disconnectReason = null;
        reconnectAttempts = 0;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        reconnectCount++;
        console.log('🟢 WhatsApp connection successfully established and active!');
        await logAuditAction('WHATSAPP_CONNECT', 'Connection successfully established.');
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      console.log(`📡 [RAW MESSAGES.UPSERT] Received event type: "${m.type}". Total messages: ${m.messages?.length}`);
      const msg = m.messages[0];
      if (!msg) return;
      
      console.log(`📡 [RAW MESSAGE KEY] ID: "${msg.key?.id}", JID: "${msg.key?.remoteJid}", fromMe: ${msg.key?.fromMe}`);
      if (msg.message) {
        console.log(`📡 [RAW MESSAGE BODY] Keys: ${Object.keys(msg.message).join(', ')}`);
      }
      
      if (!msg.key.fromMe && m.type === 'notify') {
        await handleInboundMessage(msg);
      } else if (msg.key.fromMe && m.type === 'notify') {
        await handleOutboundSync(msg);
      }
    });

  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp socket:', error);
    connectionStatus = 'disconnected';
    sock = null;
    
    // Attempt standard reconnect on startup failure
    const delay = getReconnectDelay();
    console.log(`🔄 Attempting socket initialization retry in ${delay / 1000}s...`);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      initWhatsApp();
    }, delay);
  }
}

// Format telephone to standardized JID
function formatJid(phone: string): string {
  if (phone.includes('@')) {
    return phone;
  }
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('2224') && clean.length === 15) {
    return `${clean}@lid`;
  }
  return `${clean}@s.whatsapp.net`;
}

// Format JID to clean phone number for matching
function cleanJidToPhone(jid: string): string {
  const number = jid.split('@')[0];
  return `+${number}`; // Normalize to international prefix
}

export async function handleInboundMessage(msg: proto.IWebMessageInfo) {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  const senderName = msg.pushName || 'Unknown Contact';
  const textContent = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      '';

  if (!textContent) return;

  lastInboundTime = new Date().toISOString();
  console.log(`[LIFECYCLE] Stage: INBOUND_RECEIVED | LeadID: pending | PushName: ${senderName} | JID: ${jid} | Body: "${textContent}"`);
  console.log(`[TEMP LOG - 1] Incoming message received: id=${msg.key.id}, jid=${jid}, pushName=${senderName}, text="${textContent}"`);
  console.log(`✉️ Incoming WhatsApp message from ${senderName} (${jid}): "${textContent}"`);

  // ── Track the actual JID to reply to ─────────────────────────────────
  // Always reply to the exact JID the message arrived from (handles LIDs correctly)
  let replyJid = jid;
  let cleanPhone = cleanJidToPhone(jid);
  let lead = await LeadModel.findByPhone(cleanPhone);

  // LID resolution via Baileys contacts cache
  if (jid.endsWith('@lid') && sock) {
    const cachedContact = (sock as any).contacts?.[jid];
    if (cachedContact?.id && !cachedContact.id.endsWith('@lid')) {
      cleanPhone = cleanJidToPhone(cachedContact.id);
      replyJid = cachedContact.id;
      lead = await LeadModel.findByPhone(cleanPhone);
      console.log(`ℹ️ [LID] Resolved to real JID: ${cachedContact.id}`);
    } else {
      // Fallback: match by pushName to avoid duplicate lead creation
      const allLeads = await LeadModel.findAll();
      const nameMatch = allLeads.find(
        l => l.name.toLowerCase() === senderName.toLowerCase() &&
             !l.phone.startsWith('+2224')
      );
      if (nameMatch) {
        lead = nameMatch;
        const digits = nameMatch.phone.replace(/\D/g, '');
        replyJid = digits.length > 8 ? `${digits}@s.whatsapp.net` : jid;
        console.log(`ℹ️ [LID] Matched by name to lead ${nameMatch.id}. ReplyJid: ${replyJid}`);
      } else {
        console.log(`ℹ️ [LID] No name match found. Will reply directly to LID.`);
      }
    }
  }

  if (lead) {
    console.log(`[LIFECYCLE] Stage: LEAD_RESOLVED | LeadID: ${lead.id} | Phone: ${lead.phone} | State: ai_enabled=${lead.ai_enabled}, stage=${lead.lead_stage || 'greeting'}, score=${lead.ai_score || 0}`);
  }

  // ── Auto-create lead if first contact ───────────────────────────────────
  let isNewLead = false;
  if (!lead) {
    console.log(`👤 New contact (${cleanPhone}). Auto-creating lead...`);
    const leadId = 'lead-' + Date.now();
    await LeadModel.create({
      id: leadId,
      name: senderName,
      phone: cleanPhone,
      email: null,
      company: null,
      service: 'WhatsApp Automation Intake',
      source: 'whatsapp',
      status: 'new',
      ai_score: 0,
      ai_budget: false,
      ai_summary: null,
      notes: null,
      ai_enabled: 1,
    });
    lead = await LeadModel.findById(leadId);
    isNewLead = true;
    await logAuditAction('LEAD_CREATION', `New lead "${senderName}" (${cleanPhone}) created via WhatsApp.`);
    
    // Notify admin team about new lead
    import('../services/notification.service').then(({ notifyNewLead }) => {
      notifyNewLead({
        name: senderName,
        phone: cleanPhone,
        source: 'whatsapp',
        service: 'WhatsApp Automation Intake',
      }).catch(err => console.warn('⚠️ [NOTIFY] New lead notification failed:', err));
    }).catch(err => console.warn('⚠️ [NOTIFY] Failed to import notification service:', err));
  }

  if (!lead) {
    console.error('❌ [GATEWAY] Failed to create/find lead for:', cleanPhone);
    return;
  }

  // ── Sync conversation thread ──────────────────────────────────────────
  const conversation = await ConversationModel.findByLeadId(lead.id);
  if (!conversation) {
    await ConversationModel.create({
      id: 'conv-' + lead.id,
      lead_id: lead.id,
      phone: lead.phone,
      unread_count: 1,
      last_message: textContent,
    });
  } else {
    await ConversationModel.updateThread(lead.id, textContent, true);
  }

  // ── Save inbound message to DB ────────────────────────────────────────────
  const messageId = msg.key.id || `in-${Date.now()}`;
  await MessageModel.create({
    id: messageId,
    lead_id: lead.id,
    direction: 'inbound',
    body: textContent,
    status: 'read',
  });

  // ── OPT-OUT COMPLIANCE CHECK ──────────────────────────────────────────
  // Must run BEFORE AI processing — Meta WhatsApp Business Policy requirement
  if (OPT_OUT_PATTERN.test(textContent.trim())) {
    console.log(`[LIFECYCLE] Stage: ROUTER_SELECTED | LeadID: ${lead.id} | Router: COMPLIANCE_OPTOUT | Reason: opt-out keyword`);
    console.log(`🚫 [OPT-OUT] ${lead.name} (${cleanPhone}) opted out. Cancelling all sequences.`);
    const db = getDb();
    // Mark lead as opted out
    await db.run(
      'UPDATE leads SET opt_out = 1, ai_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [lead.id]
    );
    // Cancel all active follow-up sequences
    await db.run(
      "UPDATE followup_sequences SET status = 'cancelled' WHERE lead_id = ?",
      [lead.id]
    );
    // Send compliance acknowledgment
    const optOutMsg = `✅ Aapka opt-out request receive ho gaya hai.\n\nAapko ab koi automated follow-up message nahi bheja jayega.\n\nAgar kabhi bhi hum se contact karna ho:\n📞 +91 9334757759\n🌐 trinetradigitalsolution.com`;
    await sendWhatsAppMessage(lead.phone, optOutMsg, replyJid);
    await logAuditAction('OPT_OUT', `${lead.name} (${cleanPhone}) opted out. All sequences cancelled.`);
    return; // Stop all further processing
  }

  // ── IMMEDIATE HUMAN HANDOFF SHORTCUT ──────────────────────────────────────────
  // Bypass AI entirely — serve instantly for any human-connection request
  if (HUMAN_REQUEST_PATTERN.test(textContent.trim())) {
    console.log(`[LIFECYCLE] Stage: ROUTER_SELECTED | LeadID: ${lead.id} | Router: HUMAN_SHORTCUT | Reason: human request keyword`);
    console.log(`🤝 [HANDOFF SHORTCUT] ${lead.name} requested human. Instant handoff without AI.`);
    const db = getDb();

    // Only create alert if none is already pending (deduplication)
    const existingAlert = await db.get(
      "SELECT id FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'",
      [lead.id]
    );
    if (!existingAlert) {
      await db.run('UPDATE leads SET ai_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [lead.id]);
      const alertId = `alert-${Date.now()}`;
      await db.run(
        "INSERT INTO handoff_alerts (id, lead_id, reason, status) VALUES (?, ?, ?, 'pending')",
        [alertId, lead.id, 'Customer explicitly requested to speak with a team member']
      );
      await logAuditAction('HUMAN_HANDOFF', `Instant handoff for ${lead.name} (${lead.phone}) — human request phrase detected.`);
      // Admin alert (fire and forget)
      import('../services/notification.service').then(({ notifyHandoff }) => {
        notifyHandoff({
          name: lead.name,
          phone: lead.phone,
          ai_score: lead.ai_score || 0,
          company: lead.company || undefined,
          service: lead.service || undefined,
          city: lead.city || undefined,
          budget_range: lead.budget_range || undefined,
        }, 'Customer explicitly requested to speak with a team member').catch(() => {});
      }).catch(() => {});
    }
    await sendWhatsAppMessage(lead.phone, MENU_RESPONSE['7'], replyJid);
    return;
  }

  // ── ROUTING ARCHITECTURE: Priority Enforcement ──────────────────────────────
  const trimmedMsg = textContent.trim();
  let skipMenuRouter = false;

  // Priority 1: Active State Machine (Booking Flow)
  // Also covers post-booking courtesy window (active_flow=appointment_booking, no booking_state)
  if (lead.booking_state) {
    skipMenuRouter = true;
    console.log(`[ROUTER] Priority 1: Active Booking State (${lead.booking_state}). Bypassing Menu.`);
  } else if ((lead as any).active_flow === 'appointment_booking') {
    skipMenuRouter = true;
    console.log(`[ROUTER] Priority 1b: Post-Booking Courtesy Window (active_flow=appointment_booking). Bypassing Menu.`);
  }
  // Priority 2: Human Handoff
  else if (lead.ai_enabled === 0) {
    skipMenuRouter = true;
    console.log(`[ROUTER] Priority 2: Human Handoff Active. Bypassing Menu.`);
  }
  // Priority 3: Active Intent Context
  else if ((lead as any).active_intent) {
    const isExplicitMenu = /^[1-7]$/.test(trimmedMsg) || /^(menu|help|start)$/i.test(trimmedMsg);
    if (!isExplicitMenu) {
      skipMenuRouter = true;
      console.log(`[ROUTER] Priority 3: Active Intent Context (${(lead as any).active_intent}). Bypassing Menu.`);
    }
  }

  // ── KEYWORD MENU ROUTER (Priority 4) ─────────────────────────────────────────
  // STRICT: Only digits 1-7 and exact keywords menu/help/start trigger the menu.
  // ALL natural language (website, pricing, demo, consultation, etc.) goes to OpenRouter.
  let menuKey: string | null = null;

  if (!skipMenuRouter) {
    if (/^[1-7]$/.test(trimmedMsg)) {
      menuKey = trimmedMsg;
    } else if (/^(menu|help|start)$/i.test(trimmedMsg)) {
      menuKey = 'MAIN';
    }
    // Everything else (greetings, service names, questions) falls through to Priority 5 (OpenRouter AI).
  }

  if (menuKey && MENU_RESPONSE[menuKey]) {
    console.log(`[LIFECYCLE] Stage: ROUTER_SELECTED | LeadID: ${lead.id} | Router: MENU_SHORTCUT | Reason: menu keyword '${trimmedMsg}'`);
    console.log(`📍 [MENU] Serving menu option '${menuKey}' to ${lead.name} (trigger: "${trimmedMsg}")`);
    const menuMsg = MENU_RESPONSE[menuKey];

    // Option 7 = connect to team — trigger human handoff (with dedup)
    if (menuKey === '7') {
      const db = getDb();
      const existingAlert = await db.get(
        "SELECT id FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'",
        [lead.id]
      );
      if (!existingAlert) {
        await db.run('UPDATE leads SET ai_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [lead.id]);
        const alertId = `alert-${Date.now()}`;
        await db.run(
          "INSERT INTO handoff_alerts (id, lead_id, reason, status) VALUES (?, ?, ?, 'pending')",
          [alertId, lead.id, 'Customer selected menu option 7 — Connect to Team']
        );
        await logAuditAction('HUMAN_HANDOFF', `Menu Option 7 — ${lead.name} (${lead.phone}) requested team connection.`);
      }
    }

    console.log(`[TEMP LOG - 2] Menu response generated: length=${menuMsg.length}`);
    await sendWhatsAppMessage(lead.phone, menuMsg, replyJid);
    // ⚠️ DO NOT schedule nurture sequence on menu-only interactions.
    // Nurture is only for leads who have engaged in a real conversation (AI pipeline).
    return;
  }

  // ── Delegate to conversation pipeline (OpenRouter + memory + anti-spam) ───
  console.log(`[LIFECYCLE] Stage: ROUTER_SELECTED | LeadID: ${lead.id} | Router: AI_CONVERSATION | Reason: natural language query`);
  const result = await processInboundMessage(lead.id, messageId, textContent, jid);

  if (result.skipped) {
    console.log(`⏩ [GATEWAY] Message skipped: ${result.skipReason}`);
    return;
  }

  // ── Send AI reply back to WhatsApp ───────────────────────────────────
  if (result.reply) {
    console.log(`[TEMP LOG - 2] AI response generated: reply="${result.reply.substring(0, 100)}..."`);
    console.log(`📤 [GATEWAY] Sending reply to ${lead.name} via [${replyJid}]`);
    await sendWhatsAppMessage(lead.phone, result.reply, replyJid);
  }

  // ── Schedule nurture sequence ONLY for leads who had a real AI conversation ──
  // NOT for menu-only visitors. Genuine engagement = AI responded (not skipped).
  if (isNewLead && !result.skipped && result.reply) {
    await scheduleNurtureSequence(lead.id);
  }
}

export async function handleOutboundSync(msg: proto.IWebMessageInfo) {
  const jid = msg.key.remoteJid;
  const msgId = msg.key.id;
  if (!jid || !msgId) return;

  const textContent = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      '';
  if (!textContent) return;

  // Check if this message was sent by our system
  const db = getDb();
  const existingMsg = await db.get('SELECT id FROM whatsapp_chats WHERE id = ?', [msgId]);
  
  if (existingMsg) {
    // We already know about this message (sent via API), do nothing
    return;
  }

  // It's a manual outbound message sent from a physical device!
  console.log(`📱 [GATEWAY] Detected manual physical device outbound message to ${jid}`);
  
  let cleanPhone = cleanJidToPhone(jid);
  let lead = await LeadModel.findByPhone(cleanPhone);
  
  if (!lead) return;

  console.log(`⏸️ [GATEWAY] Physical device message to ${lead.name} (${lead.phone}). Pausing AI...`);
  
  // 1. Pause AI
  await db.run('UPDATE leads SET ai_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [lead.id]);
  
  // 2. Pause nurturing
  import('../services/cron.service').then(({ pauseNurtureSequence }) => pauseNurtureSequence(lead.id));
  
  // 3. Create handoff alert
  const alertId = `alert-${Date.now()}`;
  await db.run(
    "INSERT OR IGNORE INTO handoff_alerts (id, lead_id, reason, status) VALUES (?, ?, ?, 'pending')",
    [alertId, lead.id, 'Manual message sent from physical WhatsApp device']
  );

  // 4. Save message to CRM
  await MessageModel.create({
    id: msgId,
    lead_id: lead.id,
    direction: 'outbound',
    body: textContent,
    status: 'DELIVERED',
    timestamp: new Date().toISOString()
  });

  await logAuditAction('HUMAN_TAKEOVER', `AI paused for ${lead.name} due to physical device reply.`);
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (outboundQueue.length > 0) {
      const msg = outboundQueue[0];
      
      await MessageModel.updateStatus(msg.id, 'SENDING');
      console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_START | LeadID: ${msg.leadId} | MsgID: ${msg.id} | Status: SENDING`);
      
      const targetJid = msg.overrideJid || formatJid(msg.phone);
      console.log(`[LIFECYCLE] Stage: OUTBOUND_RESOLVED_JID | LeadID: ${msg.leadId} | JID: ${targetJid}`);
      console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_START | LeadID: ${msg.leadId} | JID: ${targetJid} | Socket: ${sock ? 'initialized' : 'null'} | connectionStatus: ${connectionStatus}`);

      if (!sock) {
        console.warn(`⚠️ Cannot send WhatsApp: Client is not initialized. MsgID: ${msg.id}`);
        await MessageModel.updateStatus(msg.id, 'FAILED');
        console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_FAILURE | LeadID: ${msg.leadId} | JID: ${targetJid} | Error: Socket not initialized`);
        failedQueueCount++;
        outboundQueue.shift();
        continue;
      }

      // Throttling: simulate human typing offset delay (1.5s to 3s)
      const delay = Math.floor(Math.random() * 1500) + 1500;
      await new Promise(resolve => setTimeout(resolve, delay));

      let sentMsg = null;
      let lastError: any = null;
      const maxAttempts = 3;

      while (msg.attempts < maxAttempts) {
        try {
          console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_START | LeadID: ${msg.leadId} | JID: ${targetJid} | Attempt: ${msg.attempts + 1}/${maxAttempts}`);
          console.log(`[TEMP LOG - 5] sock.sendMessage start to targetJid=${targetJid}`);
          sentMsg = await sock.sendMessage(targetJid, { text: msg.text });
          console.log(`[TEMP LOG - 6] sock.sendMessage success: id=${sentMsg?.key?.id || 'unknown'}`);
          console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_SUCCESS | LeadID: ${msg.leadId} | JID: ${targetJid} | MsgID: ${sentMsg?.key?.id || 'unknown'} | Status: SENT`);
          break;
        } catch (err: any) {
          msg.attempts++;
          lastError = err;
          console.warn(`⚠️ [GATEWAY] sendMessage attempt ${msg.attempts} failed for MsgID ${msg.id}: ${err.message || err}`);
          
          // Smart Retry Rules:
          const errorMsg = err.message || '';
          const isPermanent = /invalid|malformed|blocked|not-found|400|404/i.test(errorMsg);
          if (isPermanent) {
            console.error(`❌ Permanent error detected. Skipping retries for MsgID ${msg.id}.`);
            break;
          }
          
          if (msg.attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, msg.attempts * 1000));
          }
        }
      }

      if (sentMsg) {
        const finalMsgId = sentMsg.key.id || msg.id;
        const db = getDb();
        await db.run(
          'UPDATE whatsapp_chats SET id = ?, status = ? WHERE id = ?',
          [finalMsgId, 'SENT', msg.id]
        );
        lastOutboundTime = new Date().toISOString();
        outboundQueue.shift();
      } else {
        await MessageModel.updateStatus(msg.id, 'FAILED');
        console.log(`[TEMP LOG - 6] sock.sendMessage failure for targetJid=${targetJid}:`, lastError?.message || lastError);
        console.log(`[TEMP LOG - 7] Full exception stack:\n`, lastError?.stack || 'No stack trace');
        console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_FAILURE | LeadID: ${msg.leadId} | JID: ${targetJid} | Error: ${lastError?.message || 'Unknown error'}`);
        failedQueueCount++;
        outboundQueue.shift();
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

export async function sendWhatsAppMessage(phone: string, text: string, overrideJid?: string): Promise<boolean> {
  console.log(`[TEMP LOG - 3] sendWhatsAppMessage called: phone=${phone}, overrideJid=${overrideJid}`);
  let lead = await LeadModel.findByPhone(phone);

  // Auto-create lead for outbound messages if none exists
  if (!lead) {
    console.log(`👤 Unknown contact (${phone}) for manual outbound. Automatically creating lead...`);
    const leadId = 'lead-' + Date.now();
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('0')) {
      if (formattedPhone.replace(/\D/g, '').length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      }
    }
    await LeadModel.create({
      id: leadId,
      name: 'WhatsApp Contact',
      phone: formattedPhone,
      email: null,
      company: null,
      service: 'Outbound WhatsApp Dispatch',
      source: 'whatsapp',
      status: 'new',
      ai_score: 0,
      ai_budget: false,
      ai_summary: null,
      notes: null
    });
    lead = await LeadModel.findById(leadId);
  }

  if (!lead) return false;

  // Ensure conversation thread is registered
  const conversation = await ConversationModel.findByLeadId(lead.id);
  if (!conversation) {
    await ConversationModel.create({
      id: 'conv-' + lead.id,
      lead_id: lead.id,
      phone: lead.phone,
      unread_count: 0,
      last_message: text
    });
  } else {
    // Update thread as outbound (sets unread_count = 0)
    await ConversationModel.updateThread(lead.id, text, false);
  }

  const msgId = `queued-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  await MessageModel.create({
    id: msgId,
    lead_id: lead.id,
    direction: 'outbound',
    body: text,
    status: 'QUEUED'
  });

  const targetJid = overrideJid || formatJid(phone);
  console.log(`[LIFECYCLE] Stage: OUTBOUND_SEND_START | LeadID: ${lead.id} | JID: ${targetJid} | Socket: ${sock ? 'initialized' : 'null'} | Status: QUEUED`);

  // Push to queue
  outboundQueue.push({
    id: msgId,
    leadId: lead.id,
    phone,
    text,
    overrideJid,
    attempts: 0
  });

  // Trigger queue processing (async)
  processQueue().catch(err => {
    console.error('❌ Error processing outbound queue:', err);
  });

  return true;
}

export function getWhatsAppStatus() {
  const pendingCount = outboundQueue.length;
  const currentStatus = connectionStatus;
  const score = calculateHealthScore(currentStatus);
  
  let sessionAgeVal: string | null = null;
  const credsPathVal = path.join(resolvedSessionPath, 'creds.json');
  if (fs.existsSync(credsPathVal)) {
    try {
      const stat = fs.statSync(credsPathVal);
      sessionAgeVal = stat.birthtime.toISOString();
    } catch (err) {}
  }

  return {
    status: currentStatus,
    qr: latestQr,
    qrImage: latestQrImage,
    lastInboundMessageTimestamp: lastInboundTime,
    lastOutboundMessageTimestamp: lastOutboundTime,
    lastSuccessfulDeliveryTimestamp: lastDeliveryTime,
    pendingQueueCount: pendingCount,
    failedQueueCount: failedQueueCount,
    reconnectCount: reconnectCount,
    activeAiProvider: getActiveAiProvider(),
    disconnectReason: disconnectReason,
    healthScore: score,
    connectedAt: connectedAt ? new Date(connectedAt).toISOString() : null,
    uptime: connectedAt ? Math.floor((Date.now() - connectedAt) / 1000) : 0,
    sessionAge: sessionAgeVal
  };
}
