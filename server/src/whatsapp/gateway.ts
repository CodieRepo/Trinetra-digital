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
import { qualifyLead } from '../services/ai.service';
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

  // ── CRITICAL: Track the actual JID to reply to ────────────────────────────
  // We ALWAYS reply to the exact JID the message came FROM (not the stored phone)
  // This correctly handles LIDs, international numbers, and linked devices.
  let replyJid = jid; // Default: reply to the same JID that sent the message

  // Search for the lead in database by phone matching
  let cleanPhone = cleanJidToPhone(jid);
  let lead = await LeadModel.findByPhone(cleanPhone);

  // LID Mitigation Strategy:
  // If the JID is an LID, try to resolve its actual phone JID from Baileys contacts cache
  if (jid.endsWith('@lid') && sock) {
    const cachedContact = (sock as any).contacts?.[jid];
    if (cachedContact?.id && !cachedContact.id.endsWith('@lid')) {
      const resolvedPhone = cleanJidToPhone(cachedContact.id);
      console.log(`ℹ️ [LID RESOLUTION] Successfully mapped LID ${jid} to real phone JID ${cachedContact.id} via contact cache.`);
      cleanPhone = resolvedPhone;
      replyJid = cachedContact.id; // Use the real phone JID for reply
      lead = await LeadModel.findByPhone(cleanPhone);
    } else {
      console.log(`ℹ️ [LID] JID ${jid} is an LID. Will reply directly to the LID (Baileys will route it correctly).`);
      // Do NOT change replyJid — Baileys can send to LID JIDs directly in newer versions
      // Fallback name matching to avoid creating duplicate leads
      const existingLeads = await LeadModel.findAll();
      const duplicateLead = existingLeads.find(
        l => l.name.toLowerCase() === senderName.toLowerCase() && 
        !l.phone.includes('lid') && 
        !l.phone.startsWith('+2224')
      );
      if (duplicateLead) {
        console.log(`ℹ️ [LID MITIGATION] Found existing lead "${duplicateLead.name}" with real phone "${duplicateLead.phone}". Reusing lead ID ${duplicateLead.id}.`);
        lead = duplicateLead;
        // Use the real phone JID stored in the lead for reply
        const realPhoneDigits = duplicateLead.phone.replace(/\D/g, '');
        replyJid = `${realPhoneDigits}@s.whatsapp.net`;
        console.log(`📍 [LID MITIGATION] Reply will target real JID: ${replyJid}`);
      }
    }
  }

  // 1. AUTO LEAD CREATION if lead does not exist in CRM
  if (!lead) {
    console.log(`👤 Unknown contact (${cleanPhone}). Automatically creating lead record...`);
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
      ai_enabled: 1
    });
    
    await logAuditAction('LEAD_CREATION', `Automatically created new lead "${senderName}" (${cleanPhone}) via inbound WhatsApp gateway.`);
    
    // Fetch newly created lead
    lead = await LeadModel.findById(leadId);
  }

  if (!lead) {
    console.error('❌ Critical: Failed to retrieve or create lead instance for phone:', cleanPhone);
    return;
  }

  // 2. AUTO CONVERSATION THREAD SYNC
  const conversation = await ConversationModel.findByLeadId(lead.id);
  if (!conversation) {
    await ConversationModel.create({
      id: 'conv-' + lead.id,
      lead_id: lead.id,
      phone: lead.phone,
      unread_count: 1,
      last_message: textContent
    });
  } else {
    await ConversationModel.updateThread(lead.id, textContent, true);
  }

  // 3. Save Message in Database (whatsapp_chats)
  const messageId = msg.key.id || `in-${Date.now()}`;
  await MessageModel.create({
    id: messageId,
    lead_id: lead.id,
    direction: 'inbound',
    body: textContent,
    status: 'read'
  });

  // 4. Fetch Conversation History
  const rawHistory = await MessageModel.findByLeadId(lead.id);
  // Get last 10 chats
  const slicedHistory = rawHistory.slice(-10);
  
  const chatHistory = slicedHistory.map(row => ({
    role: row.direction === 'inbound' ? 'user' as const : 'model' as const,
    text: row.body
  }));

  // 4b. Human Handoff Interlock: Check if AI auto-reply is disabled for this lead
  if (lead.ai_enabled === 0) {
    console.log(`ℹ️ [HUMAN HANDOFF INTERLOCK] AI auto-reply is paused (ai_enabled = 0) for lead "${lead.name}". Skipping qualification & response.`);
    return;
  }

  // 5. Trigger AI Re-qualification
  console.log(`🤖 Re-qualifying lead: ${lead.name} via Gemini with new chat context...`);
  let aiResult;
  try {
    aiResult = await qualifyLead(lead.name, lead.service || 'AI Automation', lead.source, chatHistory);
  } catch (err: any) {
    console.error(`❌ [AI FAILURE] Failed to qualify lead ${lead.name}:`, err);
    aiResult = {
      ai_score: lead.ai_score || 50,
      ai_budget: lead.ai_budget || false,
      ai_summary: "Intake evaluation in progress. Awaiting further customer responses.",
      suggested_reply: `Thank you for contacting Trinetra Digital Solution.\n\nWe've received your inquiry and our team will review it shortly.\n\nPlease share:\n• Business Name\n• Industry\n• Approximate monthly leads\n\nWe will get back to you as soon as possible.`
    };
  }

  // 6. Update Lead with new score and summary
  await LeadModel.update(lead.id, {
    ai_score: aiResult.ai_score,
    ai_budget: aiResult.ai_budget,
    ai_summary: aiResult.ai_summary,
    status: 'nurturing'
  });

  // 7. Send suggested AI reply — ALWAYS reply to the actual inbound JID, not the stored phone
  console.log(`📤 Sending AI reply to ${lead.name} via JID [${replyJid}]: "${aiResult.suggested_reply.substring(0, 60)}..."`);
  await sendWhatsAppMessage(lead.phone, aiResult.suggested_reply, replyJid);
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
