import { getDb, logAuditAction } from '../database/connection';
import { logTimelineEvent } from './timeline.service';
import { TaskModel } from '../models/tasks.model';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PIPELINE_STAGES = ['new', 'ai_qualifying', 'qualified', 'nurturing', 'won', 'lost'] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

// Default win probabilities by intent level
export const INTENT_PROBABILITY: Record<string, number> = {
  HOT: 80,
  QUOTATION_REQUIRED: 70,
  WARM: 50,
  COLD: 20,
};

// Stage-based probability fallbacks (when intent_level is unknown)
export const STAGE_PROBABILITY: Record<string, number> = {
  new: 10,
  ai_qualifying: 20,
  qualified: 60,
  nurturing: 40,
  won: 100,
  lost: 0,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineLead {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  lead_stage: string;
  intent_level: string | null;
  ai_score: number;
  recommended_package: string | null;
  deal_probability: number;
  deal_setup_value: number;
  deal_mrr: number;
  deal_annual_value: number;
  expected_revenue: number;
  stage_entered_at: string | null;
  days_in_stage: number;
  pipeline_notes: string | null;
  assigned_owner: string | null;
  created_at: string;
  updated_at: string;
  last_inbound_at: string | null;
  days_since_reply: number;
  is_stuck_7d: boolean;
  is_stuck_14d: boolean;
  is_no_reply_30d: boolean;
}

export interface PipelineStageGroup {
  stage: PipelineStage;
  label: string;
  leads: PipelineLead[];
  lead_count: number;
  total_pipeline_value: number;
  total_expected_revenue: number;
}

export interface ForecastData {
  period: string;
  pipeline_value: number;
  expected_revenue: number;
  won_revenue: number;
  lost_revenue: number;
  avg_deal_size: number;
  avg_sales_cycle_days: number;
  win_rate: number;
  total_leads_in_pipeline: number;
  leads_moved_to_won: number;
  leads_moved_to_lost: number;
}

export interface PipelineAuditEntry {
  id: string;
  lead_id: string;
  old_stage: string;
  new_stage: string;
  changed_by: string;
  reason: string | null;
  timestamp: string;
}

// ─── Stage Labels ─────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  new: 'New Leads',
  ai_qualifying: 'AI Qualifying',
  qualified: 'Qualified',
  nurturing: 'Nurturing',
  won: 'Won',
  lost: 'Lost',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `pa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function daysSince(isoDate: string | null | undefined): number {
  if (!isoDate) return 0;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const PipelineService = {

  // ── Stage Movement ───────────────────────────────────────────────────────────

  /**
   * Move a lead to a new pipeline stage.
   * Records full audit entry, timeline event, resets stuck-detection locks,
   * and updates stage_entered_at. Never allows silent changes.
   */
  async moveStage(
    leadId: string,
    newStage: PipelineStage,
    changedBy: string = 'admin',
    reason?: string
  ): Promise<void> {
    const db = getDb();

    const lead = await db.get<{ name: string; lead_stage: string }>(
      'SELECT name, lead_stage FROM leads WHERE id = ?',
      [leadId]
    );
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const oldStage = lead.lead_stage || 'new';
    if (oldStage === newStage) return; // No-op for same stage

    // 1. Write audit record
    const auditId = genId();
    await db.run(
      `INSERT INTO pipeline_audit_log (id, lead_id, old_stage, new_stage, changed_by, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, leadId, oldStage, newStage, changedBy, reason || null]
    );

    // 2. Update lead stage + reset stage timer + reset stuck locks for new stage
    await db.run(
      `UPDATE leads 
       SET lead_stage = ?,
           stage_entered_at = CURRENT_TIMESTAMP,
           stuck_task_7d = 0,
           stuck_task_14d = 0,
           stuck_task_30d = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStage, leadId]
    );

    // 3. Auto-set probability when moving to won/lost
    if (newStage === 'won') {
      await db.run('UPDATE leads SET deal_probability = 100 WHERE id = ?', [leadId]);
    } else if (newStage === 'lost') {
      await db.run('UPDATE leads SET deal_probability = 0 WHERE id = ?', [leadId]);
    }

    // 4. Timeline event
    const reasonNote = reason ? ` — ${reason}` : '';
    await logTimelineEvent(leadId, 'stage_change',
      `Pipeline stage moved: ${STAGE_LABELS[oldStage] || oldStage} → ${STAGE_LABELS[newStage] || newStage} (by ${changedBy})${reasonNote}`
    );

    await logAuditAction('PIPELINE_STAGE_MOVE',
      `Lead ${lead.name}: ${oldStage} → ${newStage} by ${changedBy}. Reason: ${reason || 'N/A'}`
    );

    console.log(`📊 [PIPELINE] ${lead.name}: ${oldStage} → ${newStage} (${changedBy})`);
  },

  // ── Deal Value Computation ────────────────────────────────────────────────

  /**
   * Sync deal_setup_value, deal_mrr, deal_annual_value from latest quotation.
   * Also sets default probability from intent_level if not manually overridden.
   */
  async syncDealValues(leadId: string): Promise<void> {
    const db = getDb();

    const lead = await db.get<{ intent_level: string | null; deal_probability: number | null }>(
      'SELECT intent_level, deal_probability FROM leads WHERE id = ?',
      [leadId]
    );
    if (!lead) return;

    // Look for latest accepted or sent quotation
    const quotation = await db.get<{ total_setup: number; total_monthly: number }>(
      `SELECT total_setup, total_monthly FROM quotations
       WHERE lead_id = ? AND status IN ('accepted','sent','viewed')
       ORDER BY version DESC, created_at DESC LIMIT 1`,
      [leadId]
    );

    let setupValue = 0;
    let mrr = 0;

    if (quotation) {
      setupValue = quotation.total_setup || 0;
      mrr = quotation.total_monthly || 0;
    }

    const annualValue = setupValue + mrr * 12;

    // Set default probability from intent_level if it's still at the default (20)
    // or hasn't been set. Sales reps can override via updateProbability().
    const intentProb = INTENT_PROBABILITY[lead.intent_level || 'COLD'] ?? 20;

    await db.run(
      `UPDATE leads 
       SET deal_setup_value = ?,
           deal_mrr = ?,
           deal_annual_value = ?,
           deal_probability = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [setupValue, mrr, annualValue, intentProb, leadId]
    );
  },

  /**
   * Manual probability override by a sales rep.
   * Clamped to 0–100 range.
   */
  async updateProbability(leadId: string, probability: number, changedBy: string = 'admin'): Promise<void> {
    const db = getDb();
    const clamped = Math.max(0, Math.min(100, Math.round(probability)));

    await db.run(
      'UPDATE leads SET deal_probability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [clamped, leadId]
    );

    await logTimelineEvent(leadId, 'human_action',
      `Win probability updated to ${clamped}% by ${changedBy}`
    );
    await logAuditAction('PROBABILITY_OVERRIDE', `Lead ${leadId}: probability set to ${clamped}% by ${changedBy}`);
    console.log(`📊 [PIPELINE] Probability override: Lead ${leadId} → ${clamped}%`);
  },

  /**
   * Manual deal value override.
   */
  async updateDealValues(
    leadId: string,
    setupValue: number,
    mrr: number
  ): Promise<void> {
    const db = getDb();
    const annual = setupValue + mrr * 12;

    await db.run(
      `UPDATE leads 
       SET deal_setup_value = ?, deal_mrr = ?, deal_annual_value = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [setupValue, mrr, annual, leadId]
    );

    console.log(`📊 [PIPELINE] Deal values updated: Lead ${leadId} — Setup: ${formatINR(setupValue)}, MRR: ${formatINR(mrr)}, Annual: ${formatINR(annual)}`);
  },

  // ── Pipeline Data ─────────────────────────────────────────────────────────

  async getPipelineData(): Promise<PipelineStageGroup[]> {
    const db = getDb();

    // Get all non-opted-out leads with their latest inbound message time
    const leads = await db.all<any[]>(`
      SELECT 
        l.*,
        MAX(CASE WHEN wc.direction = 'inbound' THEN wc.timestamp END) as last_inbound_at
      FROM leads l
      LEFT JOIN whatsapp_chats wc ON wc.lead_id = l.id
      WHERE l.opt_out = 0 OR l.opt_out IS NULL
      GROUP BY l.id
      ORDER BY l.updated_at DESC
    `);

    const now = Date.now();

    const enriched: PipelineLead[] = leads.map((l: any) => {
      const stageEnteredAt = l.stage_entered_at || l.created_at;
      const daysInStage = daysSince(stageEnteredAt);
      const daysSinceReply = daysSince(l.last_inbound_at);
      const probability = l.deal_probability ?? STAGE_PROBABILITY[l.lead_stage || 'new'] ?? 20;
      const annualValue = l.deal_annual_value || 0;
      const expectedRevenue = Math.round(annualValue * probability / 100);

      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        company: l.company || null,
        lead_stage: l.lead_stage || 'new',
        intent_level: l.intent_level || null,
        ai_score: l.ai_score || 0,
        recommended_package: l.recommended_package || null,
        deal_probability: probability,
        deal_setup_value: l.deal_setup_value || 0,
        deal_mrr: l.deal_mrr || 0,
        deal_annual_value: annualValue,
        expected_revenue: expectedRevenue,
        stage_entered_at: stageEnteredAt || null,
        days_in_stage: daysInStage,
        pipeline_notes: l.pipeline_notes || null,
        assigned_owner: l.assigned_owner || null,
        created_at: l.created_at,
        updated_at: l.updated_at,
        last_inbound_at: l.last_inbound_at || null,
        days_since_reply: daysSinceReply,
        is_stuck_7d: daysInStage >= 7 && !['won', 'lost'].includes(l.lead_stage || 'new'),
        is_stuck_14d: daysInStage >= 14 && !['won', 'lost'].includes(l.lead_stage || 'new'),
        is_no_reply_30d: daysSinceReply >= 30,
      };
    });

    // Group by stage in canonical order
    return PIPELINE_STAGES.map(stage => {
      const stageLeads = enriched.filter(l => l.lead_stage === stage);
      return {
        stage,
        label: STAGE_LABELS[stage],
        leads: stageLeads,
        lead_count: stageLeads.length,
        total_pipeline_value: stageLeads.reduce((s, l) => s + l.deal_annual_value, 0),
        total_expected_revenue: stageLeads.reduce((s, l) => s + l.expected_revenue, 0),
      };
    });
  },

  // ── Forecast Engine ───────────────────────────────────────────────────────

  async getForecastData(period: 'month' | 'quarter' | 'year' = 'month'): Promise<ForecastData> {
    const db = getDb();

    // Period start date
    const now = new Date();
    let periodStart: Date;
    if (period === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), q * 3, 1);
    } else {
      periodStart = new Date(now.getFullYear(), 0, 1);
    }
    const periodStartISO = periodStart.toISOString();

    // Active pipeline leads (qualified + nurturing + new + ai_qualifying)
    const activeLeads = await db.all<{ deal_annual_value: number; deal_probability: number }[]>(`
      SELECT deal_annual_value, deal_probability
      FROM leads
      WHERE lead_stage IN ('new','ai_qualifying','qualified','nurturing')
        AND (opt_out = 0 OR opt_out IS NULL)
    `);

    const pipelineValue = activeLeads.reduce((s, l) => s + (l.deal_annual_value || 0), 0);
    const expectedRevenue = activeLeads.reduce((s, l) =>
      s + Math.round((l.deal_annual_value || 0) * (l.deal_probability || 20) / 100), 0
    );

    // Won revenue in period — from accepted quotations
    const wonQuotations = await db.all<{ total_setup: number; total_monthly: number; accepted_at: string }[]>(`
      SELECT total_setup, total_monthly, accepted_at
      FROM quotations
      WHERE status = 'accepted' AND accepted_at >= ?
    `, [periodStartISO]);

    const wonRevenue = wonQuotations.reduce(
      (s, q) => s + (q.total_setup || 0) + (q.total_monthly || 0) * 12, 0
    );

    // Lost leads in period
    const lostLeads = await db.all<{ deal_annual_value: number }[]>(`
      SELECT deal_annual_value
      FROM leads
      WHERE lead_stage = 'lost' AND updated_at >= ?
    `, [periodStartISO]);
    const lostRevenue = lostLeads.reduce((s, l) => s + (l.deal_annual_value || 0), 0);

    // Win/loss counts in period
    const wonCount = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM leads WHERE lead_stage = 'won' AND updated_at >= ?`, [periodStartISO]
    );
    const lostCount = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM leads WHERE lead_stage = 'lost' AND updated_at >= ?`, [periodStartISO]
    );
    const totalDecided = (wonCount?.count || 0) + (lostCount?.count || 0);
    const winRate = totalDecided > 0 ? Math.round((wonCount?.count || 0) / totalDecided * 100) : 0;

    // Average deal size from won quotations
    const avgDealSize = wonQuotations.length > 0
      ? wonRevenue / wonQuotations.length
      : 0;

    // Average sales cycle (days from lead created_at to quotation accepted_at)
    const salesCycles = await db.all<{ created_at: string; accepted_at: string }[]>(`
      SELECT l.created_at, q.accepted_at
      FROM quotations q
      JOIN leads l ON l.id = q.lead_id
      WHERE q.status = 'accepted' AND q.accepted_at >= ?
    `, [periodStartISO]);

    let avgSalesCycle = 0;
    if (salesCycles.length > 0) {
      const totalDays = salesCycles.reduce((s, r) => {
        const diff = new Date(r.accepted_at).getTime() - new Date(r.created_at).getTime();
        return s + Math.max(0, diff / (24 * 60 * 60 * 1000));
      }, 0);
      avgSalesCycle = Math.round(totalDays / salesCycles.length);
    }

    return {
      period,
      pipeline_value: pipelineValue,
      expected_revenue: expectedRevenue,
      won_revenue: wonRevenue,
      lost_revenue: lostRevenue,
      avg_deal_size: Math.round(avgDealSize),
      avg_sales_cycle_days: avgSalesCycle,
      win_rate: winRate,
      total_leads_in_pipeline: activeLeads.length,
      leads_moved_to_won: wonCount?.count || 0,
      leads_moved_to_lost: lostCount?.count || 0,
    };
  },

  // ── Audit Trail ───────────────────────────────────────────────────────────

  async getAuditTrail(leadId: string): Promise<PipelineAuditEntry[]> {
    const db = getDb();
    return db.all<PipelineAuditEntry[]>(
      'SELECT * FROM pipeline_audit_log WHERE lead_id = ? ORDER BY timestamp DESC',
      [leadId]
    );
  },

  // ── Stuck Lead Detection (called by cron) ────────────────────────────────

  /**
   * Detects and flags stuck leads:
   * - > 7 days in same stage: warning task
   * - > 14 days in same stage: escalation task
   * - > 30 days no inbound reply: no-reply task
   *
   * Each type is created once per lead per stage (guarded by DB flags).
   */
  async detectStuckLeads(): Promise<void> {
    const db = getDb();

    const activeLeads = await db.all<any[]>(`
      SELECT 
        l.id, l.name, l.lead_stage, l.stage_entered_at,
        l.stuck_task_7d, l.stuck_task_14d, l.stuck_task_30d,
        MAX(CASE WHEN wc.direction = 'inbound' THEN wc.timestamp END) as last_inbound_at
      FROM leads l
      LEFT JOIN whatsapp_chats wc ON wc.lead_id = l.id
      WHERE l.lead_stage NOT IN ('won', 'lost')
        AND (l.opt_out = 0 OR l.opt_out IS NULL)
      GROUP BY l.id
    `);

    for (const lead of activeLeads) {
      const daysInStage = daysSince(lead.stage_entered_at || lead.created_at);
      const daysSinceReply = daysSince(lead.last_inbound_at);
      const stageLabel = STAGE_LABELS[lead.lead_stage] || lead.lead_stage;

      // ── 7-day stuck detection ─────────────────────────────────────────────
      if (daysInStage >= 7 && !lead.stuck_task_7d) {
        await TaskModel.create({
          lead_id: lead.id,
          title: `⚠️ ${lead.name} stuck ${daysInStage} days in ${stageLabel}`,
          description: `Lead has been in "${stageLabel}" stage for ${daysInStage} days without moving. Review and take action to advance or close this deal.`,
          status: 'pending',
          type: 'FOLLOWUP_REMINDER',
          due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // due in 4h
        });
        await db.run('UPDATE leads SET stuck_task_7d = 1 WHERE id = ?', [lead.id]);
        await logTimelineEvent(lead.id, 'ai_action',
          `⚠️ Stuck lead detected: ${daysInStage} days in ${stageLabel} without stage movement`
        );
        console.log(`⚠️ [PIPELINE] Stuck 7d task created for ${lead.name} (${daysInStage} days in ${stageLabel})`);
      }

      // ── 14-day stuck detection ────────────────────────────────────────────
      if (daysInStage >= 14 && !lead.stuck_task_14d) {
        await TaskModel.create({
          lead_id: lead.id,
          title: `🚨 ESCALATION: ${lead.name} stuck ${daysInStage} days in ${stageLabel}`,
          description: `Lead has been in "${stageLabel}" for ${daysInStage} days. This requires immediate escalation or deal closure decision.`,
          status: 'pending',
          type: 'HUMAN_HANDOFF_TASK',
          due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // due in 2h
        });
        await db.run('UPDATE leads SET stuck_task_14d = 1 WHERE id = ?', [lead.id]);
        await logTimelineEvent(lead.id, 'ai_action',
          `🚨 Escalation triggered: ${daysInStage} days stuck in ${stageLabel} — immediate review required`
        );
        console.log(`🚨 [PIPELINE] Stuck 14d escalation for ${lead.name} (${daysInStage} days)`);
      }

      // ── 30-day no-reply detection ─────────────────────────────────────────
      if (daysSinceReply >= 30 && !lead.stuck_task_30d) {
        await TaskModel.create({
          lead_id: lead.id,
          title: `📵 No reply from ${lead.name} in ${daysSinceReply} days`,
          description: `Lead has not responded on WhatsApp in ${daysSinceReply} days. Consider calling directly or closing as lost.`,
          status: 'pending',
          type: 'FOLLOWUP_REMINDER',
          due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        await db.run('UPDATE leads SET stuck_task_30d = 1 WHERE id = ?', [lead.id]);
        await logTimelineEvent(lead.id, 'ai_action',
          `📵 No WhatsApp reply in ${daysSinceReply} days — outreach task created`
        );
        console.log(`📵 [PIPELINE] No-reply 30d task created for ${lead.name}`);
      }
    }
  },
};
