/**
 * notification.service.ts
 * Admin WhatsApp notification system for Trinetra CRM
 *
 * Sends WhatsApp alerts to admin team when:
 * - Human handoff is triggered
 * - FIRE lead detected (score >= 85)
 * - Appointment is requested
 * - High-budget lead identified
 *
 * Admin number configured via ADMIN_NOTIFY_PHONE env variable.
 */

import { logAuditAction } from '../database/connection';

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

// ─── Lazy import to avoid circular dependency ─────────────────────────────────
// gateway.ts imports from cron.service, so we lazy-load sendWhatsAppMessage

async function sendAdminAlert(message: string): Promise<void> {
  if (!ADMIN_PHONE) {
    console.warn('⚠️ [NOTIFY] ADMIN_NOTIFY_PHONE not configured. Skipping notification.');
    return;
  }
  try {
    // Dynamic import to avoid circular dependency
    const { sendWhatsAppMessage } = await import('../whatsapp/gateway');
    const sent = await sendWhatsAppMessage(ADMIN_PHONE, message);
    if (sent) {
      console.log(`📲 [NOTIFY] Admin alert sent to ${ADMIN_PHONE}`);
    } else {
      console.warn(`⚠️ [NOTIFY] Failed to send admin alert (WhatsApp not connected?)`);
    }
  } catch (err) {
    console.error('❌ [NOTIFY] Error sending admin alert:', err);
  }
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
    `Reply to lead: wa.me/${lead.phone.replace(/[^0-9]/g, '')}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `handoff:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);
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
    `Reply to lead: wa.me/${lead.phone.replace(/[^0-9]/g, '')}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `fire:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);
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
}): Promise<void> {
  const message =
    `📅 *APPOINTMENT REQUESTED*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Lead:* ${lead.name}\n` +
    `📞 *Phone:* ${lead.phone}\n` +
    `🏢 *Business:* ${lead.company || 'Not specified'}\n` +
    `🎯 *Interest:* ${lead.service || 'Not specified'}\n` +
    `📍 *City:* ${lead.city || 'Not specified'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `This lead has requested a consultation/demo.\n\n` +
    `Reply to lead: wa.me/${lead.phone.replace(/[^0-9]/g, '')}\n` +
    `📅 Your Calendly: ${CALENDLY_URL}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  const dedupKey = `appt:${lead.phone}`;
  if (!shouldNotify(dedupKey)) return;

  await sendAdminAlert(message);
  await logAuditAction('ADMIN_NOTIFIED_APPOINTMENT',
    `Admin notified about appointment request from ${lead.name} (${lead.phone})`
  );
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
    `Reply to lead: wa.me/${lead.phone.replace(/[^0-9]/g, '')}\n` +
    `📋 Dashboard: https://trinetradigitalsolution.com/admin`;

  await sendAdminAlert(message);
  await logAuditAction('ADMIN_NOTIFIED_HIGH_BUDGET',
    `Admin notified about high-budget lead: ${lead.name} (${lead.phone}) — Budget: ${lead.budget_range}`
  );
}
