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
import { logTimelineEvent } from './timeline.service';
import { logTokenUsage } from './cost-monitor.service';
import { evaluateTags, applyLeadTags, TagInput } from './lead-tagger.service';
import { notifyHandoff, notifyFireLead, notifyAppointmentRequest } from './notification.service';
import { TaskModel } from '../models/tasks.model';
import { pauseNurtureSequence } from './cron.service';
import { parseNaturalDateTime } from '../utils/date-parser';

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

  // Log inbound message to timeline
  await logTimelineEvent(leadId, 'inbound', inboundText);

  // ── Phase 3C: Auto-pause nurture sequence on inbound reply ──────────────────
  // This prevents automated follow-ups from firing while a lead is actively engaging
  await pauseNurtureSequence(leadId);

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

  // Log AI Action to timeline
  await logTimelineEvent(leadId, 'ai_action', `AI generated reply using ${aiResult.model_used}. Reply: "${aiResult.reply}"`);
  
  if (aiResult.lead_stage && aiResult.lead_stage !== lead.lead_stage) {
    await logTimelineEvent(leadId, 'stage_change', `Lead stage changed from ${lead.lead_stage || 'none'} to ${aiResult.lead_stage}`);
  }

  // ── 8. Handle human handoff trigger ────────────────────────────────────────
  if (aiResult.human_handoff) {
    console.log(`🚨 [CONV] Human handoff triggered for ${lead.name}: ${aiResult.handoff_reason}`);

    // Disable AI auto-reply
    await db.run('UPDATE leads SET ai_enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [leadId]);
    await logTimelineEvent(leadId, 'human_action', `Escalated to human support. Reason: ${aiResult.handoff_reason}`);

    // Create handoff alert record
    const alertId = `alert-${Date.now()}`;
    await db.run(
      "INSERT INTO handoff_alerts (id, lead_id, reason, status) VALUES (?, ?, ?, 'pending')",
      [alertId, leadId, aiResult.handoff_reason || 'Customer requested human assistance']
    );

    await logAuditAction('HUMAN_HANDOFF',
      `Human handoff created for ${lead.name} (${lead.phone}). Reason: ${aiResult.handoff_reason}`
    );

    // Auto-spawn handoff task for sales team
    await TaskModel.spawnHandoffTask(
      leadId,
      lead.name,
      aiResult.handoff_reason || 'Customer requested human assistance'
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

  // ── 8b. Auto-spawn quotation task (QUOTATION_REQUIRED intent) ───────────────
  if (aiResult.intent_level === 'QUOTATION_REQUIRED') {
    await TaskModel.spawnQuotationTask(
      leadId,
      lead.name,
      (lead.service as string | undefined) || undefined
    );
  }

  // ── 9. Extract and update lead fields ────────────────────────────────────────────────
  const fields = aiResult.extracted_fields;

  // Normalize natural language input using custom parser
  const naturalParsed = parseNaturalDateTime(inboundText);
  let finalBookingDate = aiResult.booking_date || null;
  let finalBookingTime = aiResult.booking_time || null;

  if (naturalParsed.date) {
    finalBookingDate = naturalParsed.date;
  }
  if (naturalParsed.time) {
    finalBookingTime = naturalParsed.time;
  }

  // Double check AI responses for any relative formats that leaked
  if (finalBookingDate && !/^\d{4}-\d{2}-\d{2}$/.test(finalBookingDate)) {
    const parsedAiDate = parseNaturalDateTime(finalBookingDate);
    if (parsedAiDate.date) {
      finalBookingDate = parsedAiDate.date;
    }
  }
  if (finalBookingTime && !/^\d{2}:\d{2}$/.test(finalBookingTime)) {
    const parsedAiTime = parseNaturalDateTime(finalBookingTime);
    if (parsedAiTime.time) {
      finalBookingTime = parsedAiTime.time;
    }
  }

  // Force booking state to confirmed if date & time are both resolved
  let finalBookingState = aiResult.booking_state || lead.booking_state || null;
  const isBookingFlow = aiResult.active_flow === 'Booking' || lead.active_flow === 'Booking' || aiResult.booking_state || lead.booking_state;
  if (isBookingFlow) {
    if (finalBookingDate && finalBookingTime) {
      finalBookingState = 'confirmed';
    } else if (finalBookingDate) {
      finalBookingState = 'waiting_for_time';
    } else if (finalBookingTime) {
      if (lead.booking_date) {
        finalBookingDate = lead.booking_date;
        finalBookingState = 'confirmed';
      } else {
        finalBookingState = 'waiting_for_date';
      }
    }
  }

  const updates: Record<string, any> = {
    ai_score: aiResult.ai_score,
    ai_budget: aiResult.ai_budget ? 1 : 0,
    ai_summary: aiResult.ai_summary,
    ai_summary_detailed: aiResult.ai_summary_detailed || '',
    intent_level: aiResult.intent_level || 'COLD',
    recommended_action: aiResult.recommended_action || 'Consult client needs',
    status: aiResult.ai_score >= 75 ? 'qualified' : 'nurturing',
    lead_stage: aiResult.lead_stage || 'qualifying',
    updated_at: new Date().toISOString(),
    // Conversational State Machine updates
    booking_state: finalBookingState,
    booking_date: finalBookingDate,
    booking_time: finalBookingTime,
    active_intent: aiResult.active_intent || null,
    active_flow: aiResult.active_flow || null,
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

  // Enforce context lock counter
  let newContextCount = lead.service_context_count || 0;
  let newLastSelectedService = lead.last_selected_service || null;
  if (aiResult.last_selected_service) {
    if (aiResult.last_selected_service !== lead.last_selected_service) {
      newLastSelectedService = aiResult.last_selected_service;
      newContextCount = 1; // start of new lock (1st message)
    } else {
      newContextCount = (lead.service_context_count || 0) + 1; // increment on same
    }
  } else if (lead.last_selected_service) {
    newContextCount = (lead.service_context_count || 0) + 1; // increment if lock is active
  }

  // Release context lock if it exceeds 10 messages
  if (newContextCount > 10) {
    newLastSelectedService = null;
    newContextCount = 0;
  }

  updates.last_selected_service = newLastSelectedService;
  updates.service_context_count = newContextCount;

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

  // Notify on appointment request / booking confirmation
  const isBookingConfirmed = finalBookingState === 'confirmed';
  const wasBookingConfirmed = lead.booking_state === 'confirmed';

  if ((isBookingConfirmed && !wasBookingConfirmed) || (aiResult.appointment_requested && !lead.appointment_requested)) {
    const apptId = `appt-${Date.now()}`;
    const statusVal = isBookingConfirmed ? 'confirmed' : 'pending';
    const prefDate = finalBookingDate || null;
    const prefTime = finalBookingTime || null;

    let notificationSent = 0;
    let notificationChannel = 'whatsapp';
    let notificationTimestamp = new Date().toISOString();

    try {
      const deliverySuccess = await notifyAppointmentRequest({
        name: freshLead.name,
        phone: freshLead.phone,
        company: freshLead.company,
        service: freshLead.service || aiResult.last_selected_service || 'Consultation',
        city: freshLead.city,
        preferred_date: prefDate,
        preferred_time: prefTime,
      });
      if (deliverySuccess) {
        notificationSent = 1;
      }
    } catch (err) {
      console.warn('⚠️ [NOTIFY] Appointment notification failed:', err);
    }

    await db.run(
      `INSERT INTO appointments (id, lead_id, preferred_date, preferred_time, status, notification_sent, notification_channel, notification_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [apptId, leadId, prefDate, prefTime, statusVal, notificationSent, notificationChannel, notificationTimestamp]
    );

    // Auto-spawn appointment task for sales team
    await TaskModel.spawnAppointmentTask(leadId, lead.name);

    await logTimelineEvent(leadId, 'ai_action', `Auto-created ${statusVal} appointment for ${prefDate} at ${prefTime}. Owner notified: ${notificationSent === 1 ? 'SUCCESS' : 'FAILED'}`);
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
    await logTimelineEvent(leadId, 'human_action', 'Human handoff resolved. AI auto-reply resumed.');
    await logAuditAction('HANDOFF_RESOLVED', `Human handoff resolved for lead ${leadId}. AI re-enabled.`);
  } catch (err) {
    console.error('❌ [CONV] resolveHandoffAlert failed:', err);
  }
}
