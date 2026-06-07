/**
 * notification.service.ts
 * Admin notification system (WhatsApp + Email) for Trinetra CRM
 *
 * Sends alerts to admin team when:
 * - New lead is registered
 * - Human handoff is triggered
 * - FIRE lead detected (score >= 85)
 * - Appointment is requested
 * - High-budget lead identified
 *
 * Configured via env variables:
 * - WhatsApp: ADMIN_NOTIFY_PHONE
 * - Email (SMTP): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_TO
 */

import nodemailer from 'nodemailer';
import { logAuditAction } from '../database/connection';

// ─── SMTP Configurations ─────────────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';
const SMTP_TO = process.env.SMTP_TO || '';

// ─── Notification deduplication cache ────────────────────────────────────────
// Prevents spamming admin with repeated alerts for the same event within 15 minutes
const notifiedCache = new Map<string, number>();
const NOTIFY_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

function shouldNotify(key: string): boolean {
  const last = notifiedCache.get(key);
  const now = Date.now();
  if (last && (now - last) < NOTIFY_COOLDOWN_MS) {
    console.log(`[NOTIFY] Dedup: Suppressing ${key} (last sent ${Math.round((now - last)/1000)}s ago)`);
    return false;
  }
  notifiedCache.set(key, now);
  return true;
}

// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of notifiedCache.entries()) {
    if (now - ts > NOTIFY_COOLDOWN_MS) notifiedCache.delete(key);
  }
}, 30 * 60 * 1000);

const ADMIN_PHONE = process.env.ADMIN_NOTIFY_PHONE || '+919334757759';
const CALENDLY_URL = process.env.CALENDLY_URL || 'https://calendly.com/trinetra-demo';

function generateWaMeLink(phone: string): string {
  if (phone.startsWith('+2224')) {
    return `⚠️ *Meta is currently syncing this phone number. The true number will appear in the CRM shortly.*`;
  }
  return `Reply to lead: wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

// ─── Admin Email Alert ───────────────────────────────────────────────────────
async function sendEmailAlert(subject: string, text: string, html?: string): Promise<void> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_TO) {
    console.log('[NOTIFY] SMTP settings not fully configured in environment. Skipping email alert.');
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: SMTP_TO,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    console.log(`📧 [NOTIFY] Email alert sent to ${SMTP_TO}`);
  } catch (err) {
    console.error('❌ [NOTIFY] Error sending email alert:', err);
  }
}

// ─── Admin WhatsApp Alert ────────────────────────────────────────────────────
async function sendAdminAlert(message: string): Promise<boolean> {
  if (!ADMIN_PHONE) {
    console.warn('⚠️ [NOTIFY] ADMIN_NOTIFY_PHONE not configured. Skipping WhatsApp notification.');
    return false;
  }
  try {
    // Dynamic import to avoid circular dependency
    const { sendWhatsAppMessage } = await import('../whatsapp/gateway');
    const sent = await sendWhatsAppMessage(ADMIN_PHONE, message);
    if (sent) {
      console.log(`📲 [NOTIFY] Admin WhatsApp alert sent to ${ADMIN_PHONE}`);
      return true;
    } else {
      console.warn(`⚠️ [NOTIFY] Failed to send admin WhatsApp alert (WhatsApp not connected?)`);
      return false;
    }
  } catch (err) {
    console.error('❌ [NOTIFY] Error sending admin WhatsApp alert:', err);
    return false;
  }
}

// ─── New Lead Alert ──────────────────────────────────────────────────────────
export async function notifyNewLead(lead: {
  name: string;
  phone: string;
  source: string;
  service?: string;
  company?: string;
  city?: string;
}): Promise<void> {
  const message =
    `👤 *NEW LEAD REGISTERED*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Name:* ${lead.name}\n` +
    `📞 *Phone:* ${lead.phone}\n` +
    `🏢 *Business:* ${lead.company || 'Not specified'}\n` +
    `🎯 *Interest:* ${lead.service || 'Not specified'}\n` +
    `🌍 *Source:* ${lead.source}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `AI has initiated the conversation. Track their activity on your dashboard!\n\n` +
    `${generateWaMeLink(lead.phone)}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `new_lead:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);

  const emailSubject = `🆕 New Lead Registered: ${lead.name}`;
  const emailBody = 
    `A new lead has been registered in the CRM via WhatsApp:\n\n` +
    `- Name: ${lead.name}\n` +
    `- Phone: ${lead.phone}\n` +
    `- Business: ${lead.company || 'Not specified'}\n` +
    `- Interest: ${lead.service || 'Not specified'}\n` +
    `- Source: ${lead.source}\n\n` +
    `Click below to view the lead details and chat history on the dashboard:\n` +
    `Dashboard Link: https://trinetradigitalsolution.com/admin`;
  
  await sendEmailAlert(emailSubject, emailBody);

  await logAuditAction('ADMIN_NOTIFIED_NEW_LEAD',
    `Admin notified about new lead: ${lead.name} (${lead.phone})`
  );
}

// ─── Human Handoff Alert ──────────────────────────────────────────────────────
export async function notifyHandoff(lead: {
  name: string;
  phone: string;
  ai_score: number;
  company?: string;
  service?: string;
  city?: string;
  budget_range?: string;
}, reason: string): Promise<void> {
  const message =
    `🚨 *HUMAN HANDOFF ALERT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Lead:* ${lead.name}\n` +
    `📞 *Phone:* ${lead.phone}\n` +
    `🏢 *Business:* ${lead.company || 'Not specified'}\n` +
    `🎯 *Interest:* ${lead.service || 'Not specified'}\n` +
    `📍 *City:* ${lead.city || 'Not specified'}\n` +
    `💰 *Budget:* ${lead.budget_range || 'Not discussed'}\n` +
    `📊 *Lead Score:* ${lead.ai_score}/100\n` +
    `⚠️ *Reason:* ${reason}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${generateWaMeLink(lead.phone)}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `handoff:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);

  const emailSubject = `🚨 Human Handoff Alert: ${lead.name}`;
  const emailBody = 
    `Human Handoff Alert details:\n\n` +
    `- Lead Name: ${lead.name}\n` +
    `- Phone: ${lead.phone}\n` +
    `- Business: ${lead.company || 'Not specified'}\n` +
    `- Interest: ${lead.service || 'Not specified'}\n` +
    `- City: ${lead.city || 'Not specified'}\n` +
    `- Budget: ${lead.budget_range || 'Not discussed'}\n` +
    `- Lead Score: ${lead.ai_score}/100\n` +
    `- Handoff Reason: ${reason}\n\n` +
    `Dashboard Link: https://trinetradigitalsolution.com/admin`;
  await sendEmailAlert(emailSubject, emailBody);

  await logAuditAction('ADMIN_NOTIFIED_HANDOFF',
    `Admin notified about handoff for ${lead.name} (${lead.phone}). Reason: ${reason}`
  );
}

// ─── FIRE Lead Alert (score >= 85) ───────────────────────────────────────────
export async function notifyFireLead(lead: {
  name: string;
  phone: string;
  ai_score: number;
  company?: string;
  service?: string;
  city?: string;
}): Promise<void> {
  const message =
    `🔥 *FIRE LEAD DETECTED!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Lead:* ${lead.name}\n` +
    `📞 *Phone:* ${lead.phone}\n` +
    `🏢 *Business:* ${lead.company || 'Not specified'}\n` +
    `🎯 *Interest:* ${lead.service || 'Not specified'}\n` +
    `📍 *City:* ${lead.city || 'Not specified'}\n` +
    `📊 *Lead Score:* ${lead.ai_score}/100 ⬆️ HIGH PRIORITY\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ This lead is ready to convert. Contact immediately!\n\n` +
    `${generateWaMeLink(lead.phone)}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `fire:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);

  const emailSubject = `🔥 FIRE LEAD DETECTED: ${lead.name}`;
  const emailBody = 
    `FIRE Lead details:\n\n` +
    `- Lead Name: ${lead.name}\n` +
    `- Phone: ${lead.phone}\n` +
    `- Business: ${lead.company || 'Not specified'}\n` +
    `- Interest: ${lead.service || 'Not specified'}\n` +
    `- City: ${lead.city || 'Not specified'}\n` +
    `- Lead Score: ${lead.ai_score}/100\n\n` +
    `This lead is highly qualified. Contact them immediately!\n` +
    `Dashboard Link: https://trinetradigitalsolution.com/admin`;
  await sendEmailAlert(emailSubject, emailBody);

  await logAuditAction('ADMIN_NOTIFIED_FIRE_LEAD',
    `Admin notified about FIRE lead: ${lead.name} (${lead.phone}) — Score: ${lead.ai_score}/100`
  );
}

// ─── Appointment Request Alert ────────────────────────────────────────────────
export async function notifyAppointmentRequest(lead: {
  name: string;
  phone: string;
  company?: string;
  service?: string;
  city?: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
}): Promise<boolean> {
  const message =
    `📅 *APPOINTMENT CONFIRMED (CRM)*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Lead:* ${lead.name}\n` +
    `📞 *Phone:* ${lead.phone}\n` +
    `🏢 *Business:* ${lead.company || 'Not specified'}\n` +
    `🎯 *Interest:* ${lead.service || 'Not specified'}\n` +
    `📍 *City:* ${lead.city || 'Not specified'}\n` +
    (lead.preferred_date ? `📅 *Date:* ${lead.preferred_date}\n` : '') +
    (lead.preferred_time ? `🕒 *Time:* ${lead.preferred_time}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `The AI has automatically parsed and confirmed this appointment!\n\n` +
    `${generateWaMeLink(lead.phone)}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `appt:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return true;

  const success = await sendAdminAlert(message);

  const emailSubject = `📅 CRM Appointment Confirmed: ${lead.name}`;
  const emailBody = 
    `An appointment has been automatically scheduled in the CRM:\n\n` +
    `- Lead Name: ${lead.name}\n` +
    `- Phone: ${lead.phone}\n` +
    `- Business: ${lead.company || 'Not specified'}\n` +
    `- Interest: ${lead.service || 'Not specified'}\n` +
    `- City: ${lead.city || 'Not specified'}\n` +
    (lead.preferred_date ? `- Date: ${lead.preferred_date}\n` : '') +
    (lead.preferred_time ? `- Time: ${lead.preferred_time}\n` : '') +
    `\nDashboard Link: https://trinetradigitalsolution.com/admin`;
  await sendEmailAlert(emailSubject, emailBody);

  await logAuditAction('ADMIN_NOTIFIED_APPOINTMENT',
    `Admin notified about appointment request from ${lead.name} (${lead.phone}). Success: ${success}`
  );

  return success;
}

// ─── High Budget Alert ────────────────────────────────────────────────────────
export async function notifyHighBudgetLead(lead: {
  name: string;
  phone: string;
  company?: string;
  budget_range?: string;
  service?: string;
}): Promise<void> {
  const message =
    `💰 *HIGH BUDGET LEAD*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Lead:* ${lead.name}\n` +
    `📞 *Phone:* ${lead.phone}\n` +
    `🏢 *Business:* ${lead.company || 'Not specified'}\n` +
    `💰 *Budget:* ${lead.budget_range}\n` +
    `🎯 *Interest:* ${lead.service || 'Not specified'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ High-value prospect. Contact ASAP!\n\n` +
    `${generateWaMeLink(lead.phone)}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `budget:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);

  const emailSubject = `💰 High Budget Lead: ${lead.name}`;
  const emailBody = 
    `High Budget Lead details:\n\n` +
    `- Lead Name: ${lead.name}\n` +
    `- Phone: ${lead.phone}\n` +
    `- Business: ${lead.company || 'Not specified'}\n` +
    `- Budget: ${lead.budget_range}\n` +
    `- Interest: ${lead.service || 'Not specified'}\n\n` +
    `Dashboard Link: https://trinetradigitalsolution.com/admin`;
  await sendEmailAlert(emailSubject, emailBody);

  await logAuditAction('ADMIN_NOTIFIED_HIGH_BUDGET',
    `Admin notified about high-budget lead: ${lead.name} (${lead.phone}) — Budget: ${lead.budget_range}`
  );
}

// ─── WhatsApp Disconnect Notification ────────────────────────────────────────
export async function notifyWhatsAppDisconnect(reason: string, isPermanent: boolean, status: string): Promise<void> {
  const message =
    `⚠️ *WHATSAPP DISCONNECTED*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚨 *Status:* ${status.toUpperCase()}\n` +
    `📝 *Reason:* ${reason}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please check the CRM admin dashboard immediately to restore connectivity.\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `wa_disconnect:${status}`;
  if (!shouldNotify(dedupKey)) return;

  const emailSubject = `⚠️ WhatsApp Gateway Status: ${status.toUpperCase()}`;
  const emailBody =
    `The Trinetra WhatsApp gateway status has changed.\n\n` +
    `- New Status: ${status.toUpperCase()}\n` +
    `- Disconnect Reason: ${reason}\n\n` +
    `Click below to view the QR code or connection status on the dashboard:\n` +
    `Dashboard Link: https://trinetradigitalsolution.com/admin`;
  
  await sendEmailAlert(emailSubject, emailBody);

  await logAuditAction('WHATSAPP_DISCONNECT_ALERT',
    `Admin notified about disconnect: ${reason} (Status=${status})`
  );
}

// ─── LID Resolution Notification ─────────────────────────────────────────────
export async function notifyLidResolved(leadName: string, realPhone: string): Promise<void> {
  const message =
    `🔄 *META NUMBER SYNCED*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Lead:* ${leadName}\n` +
    `📞 *New Phone:* ${realPhone}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Meta has successfully resolved the masked phone number.\n\n` +
    `Reply to lead: wa.me/${realPhone.replace(/[^0-9]/g, '')}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  await sendAdminAlert(message);
  await logAuditAction('LID_RESOLVED', `Admin notified of resolved LID for ${leadName}: ${realPhone}`);
}

