/**
 * cost-monitor.service.ts
 * Daily token usage and cost tracking for Trinetra WhatsApp CRM
 * 
 * - Logs every OpenRouter call with token counts and USD cost
 * - Checks daily spend every 60 minutes
 * - Fires COST_ALERT audit event if daily spend > $0.50
 * - Exposes getDailyStats() for CRM dashboard
 */

import { getDb, logAuditAction } from '../database/connection';

const DAILY_ALERT_THRESHOLD_USD = 0.50;

// ─── Log a single AI call ─────────────────────────────────────────────────────

export async function logTokenUsage(
  leadId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  try {
    if (inputTokens === 0 && outputTokens === 0) return; // skip emergency/handoff templates
    
    const db = getDb();
    const id = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.run(
      `INSERT INTO token_usage (id, lead_id, model, input_tokens, output_tokens, cost_usd) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, leadId, model, inputTokens, outputTokens, costUsd]
    );
  } catch (err) {
    // Non-critical — never crash the main flow over monitoring
    console.warn('⚠️ [COST] Failed to log token usage:', err);
  }
}

// ─── Get daily stats ──────────────────────────────────────────────────────────

export async function getDailyStats(date?: string): Promise<{
  date: string;
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  by_model: Array<{ model: string; calls: number; cost_usd: number }>;
}> {
  const targetDate = date || new Date().toISOString().substring(0, 10);
  
  try {
    const db = getDb();
    
    const summary = await db.get(
      `SELECT 
         COUNT(*) as total_calls,
         COALESCE(SUM(input_tokens), 0) as total_input_tokens,
         COALESCE(SUM(output_tokens), 0) as total_output_tokens,
         COALESCE(SUM(cost_usd), 0) as total_cost_usd
       FROM token_usage 
       WHERE DATE(timestamp) = ?`,
      [targetDate]
    );
    
    const byModel = await db.all(
      `SELECT model, COUNT(*) as calls, COALESCE(SUM(cost_usd), 0) as cost_usd
       FROM token_usage 
       WHERE DATE(timestamp) = ?
       GROUP BY model
       ORDER BY cost_usd DESC`,
      [targetDate]
    );
    
    return {
      date: targetDate,
      total_calls: summary?.total_calls || 0,
      total_input_tokens: summary?.total_input_tokens || 0,
      total_output_tokens: summary?.total_output_tokens || 0,
      total_cost_usd: Number((summary?.total_cost_usd || 0).toFixed(6)),
      by_model: byModel || [],
    };
  } catch {
    return {
      date: targetDate,
      total_calls: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      by_model: [],
    };
  }
}

// ─── Get per-lead usage ───────────────────────────────────────────────────────

export async function getLeadTokenStats(leadId: string): Promise<{
  total_calls: number;
  total_cost_usd: number;
}> {
  try {
    const db = getDb();
    const row = await db.get(
      'SELECT COUNT(*) as calls, COALESCE(SUM(cost_usd), 0) as cost FROM token_usage WHERE lead_id = ?',
      [leadId]
    );
    return { total_calls: row?.calls || 0, total_cost_usd: Number((row?.cost || 0).toFixed(6)) };
  } catch {
    return { total_calls: 0, total_cost_usd: 0 };
  }
}

// ─── Daily cost check (runs every 60 minutes) ─────────────────────────────────

export function startCostMonitor(): void {
  const check = async () => {
    try {
      const stats = await getDailyStats();
      const spend = stats.total_cost_usd;
      
      await logAuditAction('COST_CHECK', 
        `Daily spend: $${spend.toFixed(4)} | Calls: ${stats.total_calls} | ` +
        `Tokens: ${stats.total_input_tokens}in / ${stats.total_output_tokens}out`
      );
      
      if (spend >= DAILY_ALERT_THRESHOLD_USD) {
        console.warn(`🚨 [COST ALERT] Daily OpenRouter spend is $${spend.toFixed(4)} — threshold $${DAILY_ALERT_THRESHOLD_USD} exceeded!`);
        await logAuditAction('COST_ALERT', 
          `⚠️ ALERT: Daily AI spend $${spend.toFixed(4)} exceeded threshold $${DAILY_ALERT_THRESHOLD_USD}. ` +
          `${stats.total_calls} calls made today.`
        );
      }
    } catch (err) {
      console.warn('⚠️ [COST] Daily check failed:', err);
    }
  };

  // Run once immediately, then every 60 minutes
  check();
  setInterval(check, 60 * 60_000);
  console.log('💰 [COST MONITOR] Daily cost monitoring started (60-min interval, alert threshold: $0.50)');
}
