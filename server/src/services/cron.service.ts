import { getDb, logAuditAction } from '../database/connection';
import { sendWhatsAppMessage } from '../whatsapp/gateway';

export function startCronService() {
  console.log('⏰ Starting lightweight background scheduler (Cron Service)...');

  // Run scheduler loop every 30 seconds
  setInterval(async () => {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      // Find all active follow-up sequences past their execution deadline
      const activeSequences = await db.all(
        `SELECT f.*, l.phone, l.name, l.ai_enabled 
         FROM followup_sequences f 
         JOIN leads l ON f.lead_id = l.id
         WHERE f.status = 'active' AND f.next_run_at <= ?`,
        [now]
      );

      for (const seq of activeSequences) {
        // Human Takeover Handoff Safety: If human has taken over, pause automated nurture
        if (seq.ai_enabled === 0) {
          console.log(`ℹ️ [CRON HANDOFF SAFETY] Skipping and pausing follow-up sequence for ${seq.name} due to active human takeover (ai_enabled=0)`);
          await db.run("UPDATE followup_sequences SET status = 'paused' WHERE id = ?", [seq.id]);
          await logAuditAction('CRON_PAUSE', `Paused automated nurture sequence for ${seq.name} due to active human takeover.`);
          continue;
        }

        console.log(`⏰ Executing follow-up step ${seq.current_step} for ${seq.name} (${seq.phone})`);
        
        let message = '';
        let nextStep = seq.current_step + 1;
        let nextRunAt: string | null = null;
        let nextStatus = 'active';

        // 4-step nurture sequence (including initial instant touchpoint)
        if (seq.sequence_name === 'default_nurture') {
          if (seq.current_step === 1) {
            message = `Hi ${seq.name}! 🚀 Just checking in to see if you had a chance to look at our custom AI Automation workflows. What did you think? Let me know if you'd like to check a live demo!`;
            // Step 2 scheduled for 2 minutes from now in accelerated test mode
            const nextDate = new Date();
            nextDate.setMinutes(nextDate.getMinutes() + 2);
            nextRunAt = nextDate.toISOString();
          } else if (seq.current_step === 2) {
            message = `Hey ${seq.name}, hope your week is going great! I wanted to share this short case study of how we automated lead capture and saved 12 hours/week for a similar business: https://trinetradigitalsolution.com/blog. Would you be open to a quick call tomorrow?`;
            // Step 3 scheduled for 2 minutes from now in accelerated test mode
            const nextDate = new Date();
            nextDate.setMinutes(nextDate.getMinutes() + 2);
            nextRunAt = nextDate.toISOString();
          } else if (seq.current_step === 3) {
            message = `Hi ${seq.name}, since we haven't connected, I'll close this thread for now. If you ever want to automate your manual lead bottlenecks or integrate WhatsApp with a custom CRM, feel free to book a slot here: https://calendly.com/trinetra-demo. Wish you the best!`;
            nextStatus = 'completed'; // Sequence ends
          }
        }

        if (message) {
          // Send message
          const sent = await sendWhatsAppMessage(seq.phone, message);
          
          if (sent) {
            // Update sequence status
            if (nextStatus === 'completed') {
              await db.run(
                "UPDATE followup_sequences SET status = 'completed' WHERE id = ?",
                [seq.id]
              );
              await logAuditAction('CRON_COMPLETE', `Follow-up nurture sequence successfully completed for ${seq.name}`);
            } else {
              await db.run(
                `UPDATE followup_sequences 
                 SET current_step = ?, next_run_at = ? 
                 WHERE id = ?`,
                [nextStep, nextRunAt, seq.id]
              );
              await logAuditAction('CRON_STEP_DISPATCH', `Dispatched follow-up Step ${seq.current_step} message to ${seq.name}. Scheduled next step.`);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Scheduler error in cron loop:', error);
    }
  }, 30000);
}

// Function to schedule a new default nurture sequence for a lead
export async function scheduleNurtureSequence(leadId: string) {
  try {
    const db = getDb();
    
    // Check if a sequence already exists
    const exists = await db.get('SELECT id FROM followup_sequences WHERE lead_id = ?', [leadId]);
    if (exists) return;

    const seqId = 'seq-' + Date.now();
    // Schedule Step 1 for 2 minutes from now (for active demo visualization!)
    const nextDate = new Date();
    nextDate.setMinutes(nextDate.getMinutes() + 2);
    const nextRunAt = nextDate.toISOString();

    await db.run(
      `INSERT INTO followup_sequences (id, lead_id, sequence_name, current_step, status, next_run_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [seqId, leadId, 'default_nurture', 1, 'active', nextRunAt]
    );
    console.log(`⏰ Scheduled automated follow-up sequence 'default_nurture' for Lead ID ${leadId} starting at ${nextRunAt}`);
  } catch (error) {
    console.error('❌ Failed to schedule follow-up sequence:', error);
  }
}
