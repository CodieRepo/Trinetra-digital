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

Please batayein:
1️⃣ Preferred date (kal / parso / koi weekday)
2️⃣ Preferred time (Morning 10-12 / Afternoon 2-5 / Evening 6-8)
3️⃣ Call ya Video call?

Ya directly book karein:
🔗 https://calendly.com/trinetra-demo

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

export async function handleInboundMessage(msg: proto.IWebMessageInfo) {
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

  // ── KEYWORD MENU ROUTER ─────────────────────────────────────────────────────
  // Numbered menu shortcuts AND natural language keywords — no AI token spent
  const trimmedMsg = textContent.trim();

  // Map natural language phrases to menu keys
  let menuKey: string | null = null;

  if (/^[1-7]$/.test(trimmedMsg)) {
    menuKey = trimmedMsg;
  } else if (/^(menu|help|hi|hello|namaste|helo|start|hey|hii|helo|hy|hye|नमस्ते|नमस्ता|good morning|good evening|good afternoon|gm|gmrng)$/i.test(trimmedMsg)) {
    menuKey = 'MAIN';
  } else if (/^(website|web site|website banani hai|website chahiye|website ka price|website kitne mein|landing page|portfolio|ecommerce|e-commerce|online store)$/i.test(trimmedMsg)) {
    menuKey = '1';
  } else if (/^(whatsapp|whatsapp automation|whatsapp bot|chatbot|automation|auto reply|automate|crm|lead management|ai bot|ai chatbot|ai system|leads manage|lead system)$/i.test(trimmedMsg)) {
    menuKey = '2';
  } else if (/^(ai|crm system|ai crm|sales system|lead qualify|lead scoring|appointment|booking|chatgpt bot|gpt bot)$/i.test(trimmedMsg)) {
    menuKey = '3';
  } else if (/^(seo|digital marketing|social media|marketing|google|google ads|facebook ads|instagram ads|lead generation|ads|campaign|google business)$/i.test(trimmedMsg)) {
    menuKey = '4';
  } else if (/^(pricing|price|rates|cost|kitna|kitne|charges|fee|fees|paisa|package|packages|plans|plan|pricelist|price list|rate list|how much|rate card|budget|kharcha)$/i.test(trimmedMsg)) {
    menuKey = '5';
  } else if (/^(services|service|kya karte ho|kya karte hain|kya milega|what do you offer|what you offer|what services|tell me|all services|list|service list|details|batao|bataiye)$/i.test(trimmedMsg)) {
    menuKey = 'MAIN';
  } else if (/^(demo|consultation|free demo|book|appointment book|call schedule|meeting|call karna|baat karna|discuss|free call|free consultation)$/i.test(trimmedMsg)) {
    menuKey = '6';
  }

  if (menuKey && MENU_RESPONSE[menuKey]) {
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

    await sendWhatsAppMessage(lead.phone, menuMsg, replyJid);
    // ⚠️ DO NOT schedule nurture sequence on menu-only interactions.
    // Nurture is only for leads who have engaged in a real conversation (AI pipeline).
    return;
  }

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

  // ── Schedule nurture sequence ONLY for leads who had a real AI conversation ──
  // NOT for menu-only visitors. Genuine engagement = AI responded (not skipped).
  if (isNewLead && !result.skipped && result.reply) {
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
