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

const resolvedSessionPath = path.resolve(process.cwd(), envConfig.WHATSAPP_SESSION_PATH);

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
      console.log(`📡 [RAW MESSAGES.UPSERT] Received event type: "${m.type}". Total messages: ${m.messages?.length}`);
      const msg = m.messages[0];
      if (!msg) return;
      
      console.log(`📡 [RAW MESSAGE KEY] ID: "${msg.key?.id}", JID: "${msg.key?.remoteJid}", fromMe: ${msg.key?.fromMe}`);
      if (msg.message) {
        console.log(`📡 [RAW MESSAGE BODY] Keys: ${Object.keys(msg.message).join(', ')}`);
      }
      
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

  // ── Save inbound message to DB ───────────────────────────────────────
  const messageId = msg.key.id || `in-${Date.now()}`;
  await MessageModel.create({
    id: messageId,
    lead_id: lead.id,
    direction: 'inbound',
    body: textContent,
    status: 'read',
  });

  // ── Delegate to conversation pipeline (OpenRouter + memory + anti-spam) ───
  const result = await processInboundMessage(lead.id, messageId, textContent, jid);

  if (result.skipped) {
    console.log(`⏩ [GATEWAY] Message skipped: ${result.skipReason}`);
    return;
  }

  // ── Send AI reply back to WhatsApp ───────────────────────────────────
  if (result.reply) {
    console.log(`📤 [GATEWAY] Sending reply to ${lead.name} via [${replyJid}]`);
    await sendWhatsAppMessage(lead.phone, result.reply, replyJid);
  }

  // ── Schedule nurture sequence for brand-new leads ─────────────────────
  if (isNewLead) {
    await scheduleNurtureSequence(lead.id);
  }
}

export async function sendWhatsAppMessage(phone: string, text: string, overrideJid?: string): Promise<boolean> {
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

  if (!sock || connectionStatus !== 'connected') {
    console.warn(`⚠️ Cannot send WhatsApp: Client is not authenticated or disconnected. Text: "${text}"`);
    await MessageModel.create({
      id: `fail-${Date.now()}`,
      lead_id: lead.id,
      direction: 'outbound',
      body: text,
      status: 'failed'
    });
    return false;
  }

  try {
    // Use the override JID if provided (for LID-based replies), otherwise format from phone
    const targetJid = overrideJid || formatJid(phone);
    console.log(`📡 [SEND] Targeting JID: ${targetJid}`);
    
    // Smart throttling: simulate human typing offset delay (1.5s to 3s)
    const delay = Math.floor(Math.random() * 1500) + 1500;
    await new Promise(resolve => setTimeout(resolve, delay));

    const sentMsg = await sock.sendMessage(targetJid, { text });
    const msgId = sentMsg?.key?.id || `out-${Date.now()}`;

    await MessageModel.create({
      id: msgId,
      lead_id: lead.id,
      direction: 'outbound',
      body: text,
      status: 'sent'
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp to ${phone}:`, error);
    await MessageModel.create({
      id: `err-${Date.now()}`,
      lead_id: lead.id,
      direction: 'outbound',
      body: text,
      status: 'failed'
    });
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
