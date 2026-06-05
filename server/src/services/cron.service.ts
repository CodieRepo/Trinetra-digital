import { getDb, logAuditAction } from '../database/connection';
import { sendWhatsAppMessage } from '../whatsapp/gateway';
import { QuotationService } from './quotation.service';
import { PipelineService } from './pipeline.service';

// ─── Production timing constants (milliseconds) ───────────────────────────────
const STEP_DELAYS_MS = {
  1: 5 * 60 * 1000,              // Step 1: 5 minutes after opt-in (warm welcome)
  2: 2 * 24 * 60 * 60 * 1000,   // Step 2: Day 3 (case study / benefits)
  3: 4 * 24 * 60 * 60 * 1000,   // Step 3: Day 7 (ROI / service spotlight)
  4: 7 * 24 * 60 * 60 * 1000,   // Step 4: Day 14 (final consultation offer)
};

// ─── Trinetra-branded follow-up message templates ─────────────────────────────
function getNurtureMessage(step: number, name: string, service?: string): string {
  const firstName = name.split(' ')[0];
  const serviceRef = service && service !== 'WhatsApp Automation Intake' 
    ? service 
    : 'business automation';

  if (step === 1) {
    return `Namaste ${firstName} ji! 🙏

*Trinetra Digital Solution* mein aapka swagat hai!

Hamari team businesses ke liye build karti hai:
✅ WhatsApp Automation & AI Chatbots
✅ Websites & Landing Pages
✅ CRM & Lead Management Systems
✅ Digital Marketing & SEO

Kya aap apne business ke liye koi specific solution dhundh rahe hain?

Main aapki requirement samajhkar sahi package suggest kar sakta hoon 😊

📞 +91 9334757759
🌐 trinetradigitalsolution.com`;
  }

  if (step === 2) {
    return `Hi ${firstName}! 📊

Maine notice kiya aapne recently hamare ${serviceRef} ke baare mein inquiry ki thi.

Ek interesting fact share karna chahta hoon:

*WhatsApp automation lagane ke baad hamare clients typically:*
✅ 60-70% manual follow-up time bachate hain
✅ Leads miss hone ki probability kaafi kam ho jaati hai
✅ Response time 24 ghante se 2 minute ho jaata hai

Aapka business bhi yeh achieve kar sakta hai.

Kya main 10 minute ka quick call arrange kar sakta hoon aapke saath? 🤝

*Final pricing scope ke hisab se vary kar sakti hai.*

📞 +91 9334757759`;
  }

  if (step === 3) {
    return `Namaste ${firstName} ji! 💡

Ek important question — kya aap jaanna chahenge ki hamare system aapke business mein practically kaise kaam kar sakte hain?

Hum offer karte hain:
🔹 *Website Development* — ₹7,999 se start
🔹 *WhatsApp Automation* — ₹7,999 setup + ₹1,499/month
🔹 *AI Chatbot + CRM* — ₹14,999 se start
🔹 *Full AI Sales System* — ₹29,999 se start

*Final pricing aapki requirement aur scope ke hisab se vary kar sakti hai.*

Kya aap ek free 15-minute consultation book karna chahenge? Mujhe bas date aur time batayein, aur main appointment book kar dunga! 😊

📞 +91 9334757759`;
  }

  if (step === 4) {
    return `Hi ${firstName}! 🎯

Yeh haara final follow-up message hai taaki aapko unnecessarily disturb na karein.

Agar aap kabhi bhi apne business ke liye:
\u2022 Website banana chahein
\u2022 WhatsApp automation setup karna chahein
\u2022 Leads ko better manage karna chahein
\u2022 CRM ya AI system chahein

Toh Trinetra Digital Solution hamesha available hai.

📞 +91 9334757759
📧 info@trinetradigitalsolution.com
🌐 trinetradigitalsolution.com

Aapke business ke liye shubhkamnayein! 🙏`;
  }

  return '';
}

// ─── Main cron service ────────────────────────────────────────────────────────

export function startCronService() {
  console.log('⏰ Starting production follow-up scheduler (Cron Service)...');

  setInterval(async () => {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      // Find all active follow-up sequences past their execution deadline
      const activeSequences = await db.all(
        `SELECT f.*, l.phone, l.name, l.ai_enabled, l.opt_out, l.service
         FROM followup_sequences f
         JOIN leads l ON f.lead_id = l.id
         WHERE f.status = 'active' AND f.next_run_at <= ?`,
        [now]
      );

      for (const seq of activeSequences) {

        // ── Compliance: Skip opted-out leads ────────────────────────────────
        if (seq.opt_out === 1) {
          console.log(`🚫 [CRON OPT-OUT] Skipping ${seq.name} — opted out. Completing sequence.`);
          await db.run("UPDATE followup_sequences SET status = 'cancelled' WHERE id = ?", [seq.id]);
          await logAuditAction('CRON_OPT_OUT_SKIP', `Cancelled sequence for opted-out lead: ${seq.name}`);
          continue;
        }

        // ── Compliance: Skip if human has taken over ────────────────────────
        if (seq.ai_enabled === 0) {
          console.log(`ℹ️ [CRON HANDOFF] Skipping ${seq.name} — human takeover active. Pausing sequence.`);
          await db.run("UPDATE followup_sequences SET status = 'paused' WHERE id = ?", [seq.id]);
          await logAuditAction('CRON_PAUSE', `Paused sequence for ${seq.name} — human handoff active.`);
          continue;
        }

        console.log(`⏰ [CRON] Executing follow-up step ${seq.current_step} for ${seq.name} (${seq.phone})`);

        const message = getNurtureMessage(seq.current_step, seq.name, seq.service);
        const isLastStep = seq.current_step >= 4;

        if (!message) {
          // Unexpected step number — complete the sequence
          await db.run("UPDATE followup_sequences SET status = 'completed' WHERE id = ?", [seq.id]);
          continue;
        }

        // ── Send message ────────────────────────────────────────────────────
        const sent = await sendWhatsAppMessage(seq.phone, message);

        if (sent) {
          if (isLastStep) {
            await db.run("UPDATE followup_sequences SET status = 'completed' WHERE id = ?", [seq.id]);
            await logAuditAction('CRON_COMPLETE', `Follow-up sequence completed for ${seq.name} after Step ${seq.current_step}.`);
          } else {
            const nextStep = seq.current_step + 1;
            const delayMs = STEP_DELAYS_MS[nextStep as keyof typeof STEP_DELAYS_MS] || (7 * 24 * 60 * 60 * 1000);
            const nextRunAt = new Date(Date.now() + delayMs).toISOString();
            await db.run(
              `UPDATE followup_sequences SET current_step = ?, next_run_at = ? WHERE id = ?`,
              [nextStep, nextRunAt, seq.id]
            );
            await logAuditAction('CRON_STEP', `Step ${seq.current_step} sent to ${seq.name}. Next step ${nextStep} at ${nextRunAt}.`);
          }
        } else {
          // Failed to send — retry next cycle (do not advance step)
          console.warn(`⚠️ [CRON] Message send failed for ${seq.name}. Will retry next cycle.`);
          await logAuditAction('CRON_SEND_FAIL', `Failed to send Step ${seq.current_step} to ${seq.name} (${seq.phone}).`);
        }
      }

    } catch (error) {
      console.error('❌ [CRON] Scheduler loop error:', error);
    }

    // ── Quotation expiry sweep ────────────────────────────────────────────────
    try {
      await QuotationService.processExpiry();
    } catch (expiryErr) {
      console.error('❌ [CRON] Expiry sweep error:', expiryErr);
    }

    // ── Pipeline stuck-lead detection ───────────────────────────────────
    try {
      await PipelineService.detectStuckLeads();
    } catch (pipelineErr) {
      console.error('❌ [CRON] Pipeline stuck-lead detection error:', pipelineErr);
    }
  }, 30_000); // Check every 30 seconds
}

// ─── Schedule new nurture sequence for a lead ─────────────────────────────────

export async function scheduleNurtureSequence(leadId: string) {
  try {
    const db = getDb();

    // Check if a sequence already exists (avoid duplicates)
    const exists = await db.get('SELECT id FROM followup_sequences WHERE lead_id = ?', [leadId]);
    if (exists) return;

    const seqId = 'seq-' + Date.now();
    // Step 1 scheduled 5 minutes from now (warm welcome timing)
    const nextRunAt = new Date(Date.now() + STEP_DELAYS_MS[1]).toISOString();

    await db.run(
      `INSERT INTO followup_sequences (id, lead_id, sequence_name, current_step, status, next_run_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [seqId, leadId, 'default_nurture', 1, 'active', nextRunAt]
    );

    console.log(`⏰ [CRON] Nurture sequence scheduled for Lead ID ${leadId}. Step 1 at ${nextRunAt}`);
  } catch (error) {
    console.error('❌ [CRON] Failed to schedule nurture sequence:', error);
  }
}

// ─── Pause sequence for a lead (human handoff) ────────────────────────────────

export async function pauseNurtureSequence(leadId: string) {
  try {
    const db = getDb();
    await db.run(
      "UPDATE followup_sequences SET status = 'paused' WHERE lead_id = ? AND status = 'active'",
      [leadId]
    );
    console.log(`⏸️ [CRON] Paused nurture sequence for Lead ID ${leadId}`);
  } catch (error) {
    console.error('❌ [CRON] Failed to pause nurture sequence:', error);
  }
}

// ─── Resume sequence for a lead (AI re-enabled after handoff) ─────────────────

export async function resumeNurtureSequence(leadId: string) {
  try {
    const db = getDb();
    await db.run(
      "UPDATE followup_sequences SET status = 'active' WHERE lead_id = ? AND status = 'paused'",
      [leadId]
    );
    console.log(`▶️ [CRON] Resumed nurture sequence for Lead ID ${leadId}`);
  } catch (error) {
    console.error('❌ [CRON] Failed to resume nurture sequence:', error);
  }
}
