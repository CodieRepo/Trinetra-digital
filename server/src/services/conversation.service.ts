/**
 * conversation.service.ts
 * Master orchestrator for inbound WhatsApp message processing
 * 
 * Pipeline:
 * 1. Anti-spam guard (5s cooldown per JID)
 * 2. Human handoff check
 * 3. Load memory context (rolling summary + last 10 messages)
 * 4. Call OpenRouter AI
 * 5. Parse response + extract lead fields
 * 6. Update lead in DB
 * 7. Log token cost
 * 8. Return reply text
 */

import { getDb, logAuditAction } from '../database/connection';
import { processWithAI, AIContext } from './openrouter.service';
import { buildContext, updateMemoryAfterResponse } from './memory.service';
import { logTokenUsage } from './cost-monitor.service';
import { evaluateTags, applyLeadTags, TagInput } from './lead-tagger.service';
import { notifyHandoff, notifyFireLead, notifyAppointmentRequest } from './notification.service';

// ─── Anti-spam cooldown map (JID → last response timestamp) ───────────────────

const lastResponseTime = new Map<string, number>();
const COOLDOWN_MS = 5_000; // 5 seconds minimum between AI responses per JID

// ─── Duplicate message guard (msgId → timestamp) ──────────────────────────────

const processedMessageIds = new Set<string>();
const MAX_DEDUP_CACHE = 500;

// ─── Main pipeline ────────────────────────────────────────────────────────────

export interface ProcessResult {
  reply: string;
  skipped: boolean;
  skipReason?: string;
  human_handoff: boolean;
  ai_score: number;
}

export async function processInboundMessage(
  leadId: string,
  messageId: string,
  inboundText: string,
  jid: string
): Promise<ProcessResult> {
  const db = getDb();

  // ── 1. Duplicate message guard ──────────────────────────────────────────────
  if (processedMessageIds.has(messageId)) {
    return { reply: '', skipped: true, skipReason: 'duplicate_message_id', human_handoff: false, ai_score: 0 };
  }
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > MAX_DEDUP_CACHE) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }

  // ── 2. Anti-spam cooldown ───────────────────────────────────────────────────
  const now = Date.now();
  const lastSent = lastResponseTime.get(jid) || 0;
  if (now - lastSent < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastSent)) / 1000);
    console.log(`⏳ [CONV] Anti-spam cooldown active for JID ${jid} (${remaining}s remaining). Skipping.`);
    return { reply: '', skipped: true, skipReason: `cooldown_${remaining}s`, human_handoff: false, ai_score: 0 };
  }

  // ── 3. Load lead info ───────────────────────────────────────────────────────
  const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) {
    console.error(`❌ [CONV] Lead ${leadId} not found`);
    return { reply: '', skipped: true, skipReason: 'lead_not_found', human_handoff: false, ai_score: 0 };
  }

  // ── 4. Check ai_enabled interlock ───────────────────────────────────────────
  if (lead.ai_enabled === 0) {
    console.log(`⏸️ [CONV] AI paused for ${lead.name} (human handoff active).`);
    return { reply: '', skipped: true, skipReason: 'human_handoff_active', human_handoff: true, ai_score: lead.ai_score };
  }

  // ── 5. Check for existing pending handoff alert ─────────────────────────────
  const pendingHandoff = await db.get(
    "SELECT id FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'",
    [leadId]
  );
  if (pendingHandoff) {
    console.log(`🚨 [CONV] Pending human handoff alert for ${lead.name}. AI response suppressed.`);
    return { reply: '', skipped: true, skipReason: 'handoff_alert_pending', human_handoff: true, ai_score: lead.ai_score };
  }

  // ── 6. Build context (rolling memory + last 10 messages) ───────────────────
  const ctx = await buildContext(leadId);
  if (!ctx) {
    console.error(`❌ [CONV] Failed to build context for lead ${leadId}`);
    return { reply: '', skipped: true, skipReason: 'context_build_failed', human_handoff: false, ai_score: 0 };
  }

  // ── 7. Call OpenRouter AI ───────────────────────────────────────────────────
  console.log(`🧠 [CONV] Processing message for ${lead.name} | Context: ${ctx.recentMessages.length} msgs + summary`);
  const aiResult = await processWithAI(ctx);

  // ── 8. Handle human handoff trigger ────────────────────────────────────────
  if (aiResult.human_handoff) {
    console.log(`🚨 [CONV] Human handoff triggered for ${lead.name}: ${aiResult.handoff_reason}`);

    // Disable AI auto-reply
    await db.run('UPDATE leads SET ai_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [leadId]);

    // Create handoff alert record
    const alertId = `alert-${Date.now()}`;
    await db.run(
      "INSERT INTO handoff_alerts (id, lead_id, reason, status) VALUES (?, ?, ?, 'pending')",
      [alertId, leadId, aiResult.handoff_reason || 'Customer requested human assistance']
    );

    await logAuditAction('HUMAN_HANDOFF',
      `Human handoff created for ${lead.name} (${lead.phone}). Reason: ${aiResult.handoff_reason}`
    );

    // Notify admin team via WhatsApp
    notifyHandoff({
      name: lead.name,
      phone: lead.phone,
      ai_score: aiResult.ai_score,
      company: lead.company,
      service: lead.service,
      city: lead.city,
      budget_range: lead.budget_range,
    }, aiResult.handoff_reason || 'Customer requested human assistance')
      .catch(err => console.warn('⚠️ [NOTIFY] Handoff notification failed:', err));
  }

  // ── 9. Extract and update lead fields ────────────────────────────────────────────────
  const fields = aiResult.extracted_fields;
  const updates: Record<string, any> = {
    ai_score: aiResult.ai_score,
    ai_budget: aiResult.ai_budget ? 1 : 0,
    ai_summary: aiResult.ai_summary,
    status: aiResult.ai_score >= 75 ? 'qualified' : 'nurturing',
    lead_stage: aiResult.lead_stage || 'qualifying',
    updated_at: new Date().toISOString(),
  };

  if (fields.name     && fields.name !== lead.name) updates.name = fields.name;
  if (fields.company  && !lead.company)              updates.company = fields.company;
  if (fields.city     && !lead.city)                 updates.city = fields.city;
  if (fields.service_interest && !lead.service)      updates.service = fields.service_interest;
  // New qualification fields
  if (fields.business_type     && !lead.business_type)     updates.business_type = fields.business_type;
  if (fields.team_size         && !lead.team_size)         updates.team_size = fields.team_size;
  if (fields.monthly_lead_volume && !lead.monthly_lead_volume) updates.monthly_lead_volume = fields.monthly_lead_volume;
  if (fields.current_problems  && !lead.current_problems)  updates.current_problems = fields.current_problems;
  if (fields.budget            && !lead.budget_range)       updates.budget_range = fields.budget;
  if (fields.has_website       !== null && fields.has_website !== undefined) updates.has_website = fields.has_website ? 1 : 0;
  if (fields.has_crm           !== null && fields.has_crm !== undefined)     updates.has_crm = fields.has_crm ? 1 : 0;
  if (fields.is_decision_maker !== null && fields.is_decision_maker !== undefined) updates.is_decision_maker = fields.is_decision_maker ? 1 : 0;
  if (aiResult.recommended_package) updates.recommended_package = aiResult.recommended_package;
  if (aiResult.appointment_requested) updates.appointment_requested = 1;

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  await db.run(
    `UPDATE leads SET ${setClauses} WHERE id = ?`,
    [...Object.values(updates), leadId]
  );

  // ── 10. Auto-apply lead tags ─────────────────────────────────────────────────
  const tagInput: TagInput = {
    ai_score: aiResult.ai_score,
    ai_budget: aiResult.ai_budget,
    service: fields.service_interest || lead.service,
    budget_range: fields.budget || lead.budget_range,
    is_decision_maker: fields.is_decision_maker,
    opt_out: false,
    appointment_requested: aiResult.appointment_requested,
    team_size: fields.team_size || lead.team_size,
    recommended_package: aiResult.recommended_package || undefined,
    lead_stage: aiResult.lead_stage,
    human_handoff: aiResult.human_handoff,
  };
  const newTags = evaluateTags(tagInput);
  await applyLeadTags(leadId, newTags);

  // ── 11. Admin notifications ──────────────────────────────────────────────────
  const freshLead = { ...lead, ...updates };

  // Notify on FIRE lead
  if (aiResult.ai_score >= 85 && lead.ai_score < 85) {
    await notifyFireLead({
      name: freshLead.name,
      phone: freshLead.phone,
      ai_score: aiResult.ai_score,
      company: freshLead.company,
      service: freshLead.service,
      city: freshLead.city,
    }).catch(err => console.warn('⚠️ [NOTIFY] FIRE lead notification failed:', err));
  }

  // Notify on appointment request
  if (aiResult.appointment_requested && !lead.appointment_requested) {
    // Create appointment record
    const apptId = `appt-${Date.now()}`;
    await db.run(
      `INSERT INTO appointments (id, lead_id, status) VALUES (?, ?, 'pending')`,
      [apptId, leadId]
    );
    await notifyAppointmentRequest({
      name: freshLead.name,
      phone: freshLead.phone,
      company: freshLead.company,
      service: freshLead.service,
      city: freshLead.city,
    }).catch(err => console.warn('⚠️ [NOTIFY] Appointment notification failed:', err));
  }

  // Log hot lead
  if (aiResult.ai_score >= 75) {
    await logAuditAction('HOT_LEAD',
      `🔥 ${lead.name} scored ${aiResult.ai_score}/100 — HOT LEAD! Consider booking a consultation.`
    );
  }

  // ── 12. Update rolling memory summary ───────────────────────────────────────────
  if (aiResult.ai_summary) {
    await updateMemoryAfterResponse(leadId, aiResult.ai_summary);
  }

  // ── 13. Log token cost ───────────────────────────────────────────────────────────
  await logTokenUsage(leadId, aiResult.model_used, aiResult.input_tokens, aiResult.output_tokens, aiResult.cost_usd);

  // ── 14. Update cooldown timestamp ────────────────────────────────────────────────
  lastResponseTime.set(jid, Date.now());

  return {
    reply: aiResult.reply,
    skipped: false,
    human_handoff: aiResult.human_handoff,
    ai_score: aiResult.ai_score,
  };
}

// ─── Resolve a human handoff alert ────────────────────────────────────────────

export async function resolveHandoffAlert(leadId: string): Promise<void> {
  try {
    const db = getDb();
    await db.run(
      "UPDATE handoff_alerts SET status = 'resolved' WHERE lead_id = ? AND status = 'pending'",
      [leadId]
    );
    await db.run(
      'UPDATE leads SET ai_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [leadId]
    );
    await logAuditAction('HANDOFF_RESOLVED', `Human handoff resolved for lead ${leadId}. AI re-enabled.`);
  } catch (err) {
    console.error('❌ [CONV] resolveHandoffAlert failed:', err);
  }
}
