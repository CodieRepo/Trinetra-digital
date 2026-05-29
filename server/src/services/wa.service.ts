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
import dotenv from 'dotenv';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { getDb } from '../database/db';
import { qualifyLead } from './ai.service';

dotenv.config();

const sessionPath = process.env.WHATSAPP_SESSION_PATH || './data/wa-session';
const resolvedSessionPath = path.resolve(process.cwd(), sessionPath);

// Ensure the directory exists
if (!fs.existsSync(resolvedSessionPath)) {
  fs.mkdirSync(resolvedSessionPath, { recursive: true });
}

let sock: WASocket | null = null;
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let latestQr: string | null = null;
let latestQrImage: string | null = null;

// Reconnection backoff variables
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
const MAX_RECONNECT_ATTEMPTS = 15;

// Clean logger to suppress Baileys verbose output
const logger = pino({ level: 'silent' });

function getReconnectDelay(statusCode?: number): number {
  if (statusCode === DisconnectReason.restartRequired) {
    console.log('🔄 Restart required by server. Reconnecting instantly (1s)...');
    return 1000;
  }
  // Starting at 5 seconds, double every attempt, cap at 5 minutes (300000ms)
  const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 300000);
  return delay;
}

export async function initWhatsApp() {
  if (sock) return;

  console.log('🔄 Initializing WhatsApp Bot gateway (Baileys)...');
  connectionStatus = 'connecting';

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
      version, // Pass the fetched version for compatibility
      printQRInTerminal: false, // Handled manually below
      browser: Browsers.ubuntu('Chrome'), // Production-grade user agent signature
      connectTimeoutMs: 60000, // Increase connection timeout to 60s
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000,
      syncFullHistory: false, // Low VPS RAM usage: do not download historic media/chats
      logger
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQr = qr;
        console.log('📷 New WhatsApp QR code generated. Scan this to pair your device:');
        try {
          // Render in terminal fallback
          qrcodeTerminal.generate(qr, { small: true });
          
          // Generate Base64 QR Image for dashboard API exposure
          latestQrImage = await QRCode.toDataURL(qr);
          console.log('✨ Base64 QR image updated successfully.');
        } catch (qrErr) {
          console.error('⚠️ Error rendering or generating QR code:', qrErr);
        }
      }

      if (connection === 'close') {
        latestQr = null;
        latestQrImage = null;
        connectionStatus = 'disconnected';
        sock = null;

        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        console.log(`🔴 WhatsApp connection closed. Status Code: ${statusCode || 'Unknown'}, Error: ${error || 'Unknown'}`);

        let shouldReconnect = true;
        let shouldCleanSession = false;

        if (statusCode === DisconnectReason.loggedOut) {
          console.warn('👤 WhatsApp session logged out / deleted by user. Auto-reconnection disabled.');
          shouldReconnect = false;
          shouldCleanSession = true;
        } else if (statusCode === DisconnectReason.badSession) {
          console.error('🚨 Bad session credentials. Resetting session directory...');
          shouldReconnect = true;
          shouldCleanSession = true;
        } else if (statusCode === DisconnectReason.connectionReplaced) {
          console.warn('⚠️ WhatsApp connection replaced by another active session. Reconnecting in 30s...');
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts = 0; // Reset attempts
            initWhatsApp();
          }, 30000);
          return;
        }

        if (shouldCleanSession) {
          try {
            console.log(`🗑️ Erasing invalid session files at: ${resolvedSessionPath}`);
            fs.rmSync(resolvedSessionPath, { recursive: true, force: true });
            fs.mkdirSync(resolvedSessionPath, { recursive: true });
          } catch (cleanErr) {
            console.error('❌ Failed to clean session path:', cleanErr);
          }
        }

        if (shouldReconnect) {
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`🚨 Reached max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}). Pausing automatic reconnect. Please check credentials or network.`);
            // Back off extremely slowly (try every 10 minutes)
            const slowRetryDelay = 600000;
            console.log(`⏳ Entering cool-down cycle. Next check in ${slowRetryDelay / 60000} minutes...`);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts = 0; // Reset to retry again
              initWhatsApp();
            }, slowRetryDelay);
            return;
          }

          const delay = getReconnectDelay(statusCode);
          console.log(`🔄 Attempting automatic reconnection in ${delay / 1000}s (Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            initWhatsApp();
          }, delay);
        }
      } else if (connection === 'open') {
        latestQr = null;
        latestQrImage = null;
        connectionStatus = 'connected';
        reconnectAttempts = 0;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        console.log('🟢 WhatsApp connection successfully established and active!');
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === 'notify') {
        await handleInboundMessage(msg);
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
  let clean = phone.replace(/\D/g, '');
  if (!clean.endsWith('@s.whatsapp.net')) {
    clean = `${clean}@s.whatsapp.net`;
  }
  return clean;
}

// Format JID to clean phone number for matching
function cleanJidToPhone(jid: string): string {
  const number = jid.split('@')[0];
  return `+${number}`; // Normalize to international prefix
}

async function handleInboundMessage(msg: proto.IWebMessageInfo) {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  const senderName = msg.pushName || 'Unknown Contact';
  const textContent = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      '';

  if (!textContent) return;

  console.log(`✉️ Incoming WhatsApp message from ${senderName} (${jid}): "${textContent}"`);

  const db = getDb();
  
  // Search for the lead in database by phone matching
  const cleanPhone = cleanJidToPhone(jid);
  // Match loosely on the digits (to handle prefix matching)
  const phoneDigits = cleanPhone.replace(/\D/g, '');
  
  const lead = await db.get(
    `SELECT * FROM leads WHERE replace(phone, '+', '') LIKE ? OR ? LIKE '%' || replace(phone, '+', '')`,
    [`%${phoneDigits}%`, phoneDigits]
  );

  if (!lead) {
    console.log(`⚠️ Received WhatsApp from unindexed contact (${cleanPhone}). Auto-skipping dynamic CRM routing.`);
    return;
  }

  // 1. Save Inbound Chat
  const messageId = msg.key.id || `in-${Date.now()}`;
  await db.run(
    'INSERT INTO whatsapp_chats (id, lead_id, direction, body) VALUES (?, ?, ?, ?)',
    [messageId, lead.id, 'inbound', textContent]
  );

  // 2. Fetch Conversation History
  const rawHistory = await db.all(
    'SELECT direction, body FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC LIMIT 10',
    [lead.id]
  );
  
  const chatHistory = rawHistory.map(row => ({
    role: row.direction === 'inbound' ? 'user' as const : 'model' as const,
    text: row.body
  }));

  // 3. Trigger AI Re-qualification
  console.log(`🤖 Re-qualifying lead: ${lead.name} via Gemini with new chat context...`);
  const aiResult = await qualifyLead(lead.name, lead.service || 'AI Automation', lead.source, chatHistory);

  // 4. Update Lead with new score and summary
  await db.run(
    `UPDATE leads 
     SET ai_score = ?, ai_budget = ?, ai_summary = ?, status = 'nurturing', updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [aiResult.ai_score, aiResult.ai_budget ? 1 : 0, aiResult.ai_summary, lead.id]
  );

  // 5. Send suggested AI reply automatically to establish instant responsive feedback loop
  console.log(`📤 Sending AI conversational follow-up to ${lead.name}: "${aiResult.suggested_reply}"`);
  await sendWhatsAppMessage(lead.phone, aiResult.suggested_reply);
}

export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  const db = getDb();
  
  // Find lead ID for registration in audits
  const phoneDigits = phone.replace(/\D/g, '');
  const lead = await db.get(
    `SELECT id FROM leads WHERE replace(phone, '+', '') LIKE ? OR ? LIKE '%' || replace(phone, '+', '')`,
    [`%${phoneDigits}%`, phoneDigits]
  );

  if (!sock || connectionStatus !== 'connected') {
    console.warn(`⚠️ Cannot send WhatsApp: Client is not authenticated or disconnected. Text: "${text}"`);
    // Save to database anyway for logging
    if (lead) {
      await db.run(
        'INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
        [`fail-${Date.now()}`, lead.id, 'outbound', text, 'failed']
      );
    }
    return false;
  }

  try {
    const formatted = formatJid(phone);
    
    // Smart throttling: simulate human typing offset delay (1.5s to 3s)
    const delay = Math.floor(Math.random() * 1500) + 1500;
    await new Promise(resolve => setTimeout(resolve, delay));

    await sock.sendMessage(formatted, { text });

    if (lead) {
      await db.run(
        'INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
        [`out-${Date.now()}`, lead.id, 'outbound', text, 'sent']
      );
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp to ${phone}:`, error);
    if (lead) {
      await db.run(
        'INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)',
        [`err-${Date.now()}`, lead.id, 'outbound', text, 'failed']
      );
    }
    return false;
  }
}

export function getWhatsAppStatus() {
  return {
    status: connectionStatus,
    qr: latestQr,
    qrImage: latestQrImage
  };
}
