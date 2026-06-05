import { Request, Response } from 'express';
import { getDb } from '../database/connection';

export const AnalyticsController = {

  // GET /api/analytics — main dashboard metrics
  async getMetrics(req: Request, res: Response) {
    try {
      const db = getDb();

      // Total Leads count
      const totalRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM leads');
      const totalLeads = totalRow?.count || 0;

      // AI Qualified Leads count
      const qualifiedRow = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM leads WHERE status IN ('qualified', 'nurturing', 'won') OR ai_score >= 80"
      );
      const qualifiedLeads = qualifiedRow?.count || 0;

      // Won Leads
      const wonRow = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'won'");
      const wonLeads = wonRow?.count || 0;

      // Leads Captured Today
      const todayRow = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM leads WHERE date(created_at) = date('now', 'localtime')"
      );
      const leadsToday = todayRow?.count || 0;

      // Hot leads (score >= 70)
      const hotRow = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE ai_score >= 70");
      const hotLeads = hotRow?.count || 0;

      // FIRE leads (score >= 85)
      const fireRow = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE ai_score >= 85");
      const fireLeads = fireRow?.count || 0;

      // Pending handoffs
      const handoffRow = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM handoff_alerts WHERE status = 'pending'"
      );
      const pendingHandoffs = handoffRow?.count || 0;

      // Pending appointments
      const apptRow = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'"
      );
      const pendingAppointments = apptRow?.count || 0;

      // Opt-out count
      const optOutRow = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE opt_out = 1");
      const optOutCount = optOutRow?.count || 0;

      // Conversion rate
      const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

      // Intent-level breakdown (Phase 3A)
      const intentRows = await db.all(`
        SELECT intent_level, COUNT(*) as count
        FROM leads
        WHERE intent_level IS NOT NULL AND intent_level != ''
        GROUP BY intent_level
      `);
      const intentBreakdown: Record<string, number> = { HOT: 0, WARM: 0, COLD: 0, QUOTATION_REQUIRED: 0 };
      for (const row of intentRows) {
        if (row.intent_level in intentBreakdown) {
          intentBreakdown[row.intent_level] = row.count;
        }
      }

      // Pending tasks count (Phase 3B)
      const pendingTasksRow = await db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'"
      );
      const pendingTasks = pendingTasksRow?.count || 0;

      // Recent activity list (last 5 chats)
      const recentActivity = await db.all(`
        SELECT c.id, c.direction, c.body, c.timestamp, l.name as lead_name, l.ai_score
        FROM whatsapp_chats c
        JOIN leads l ON c.lead_id = l.id
        ORDER BY c.timestamp DESC
        LIMIT 5
      `);

      // Pipeline counts
      const newLeadsCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'new'");
      const aiQualifyingCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'ai_qualifying'");
      const nurturingCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'nurturing'");

      const pipeline = [
        { label: "New Leads",        value: newLeadsCount?.count || 0,   color: "from-[#BF7340] to-orange-400",         pct: 100 },
        { label: "AI Qualifying",    value: aiQualifyingCount?.count || 0, color: "from-[#BF7340]/80 to-[#BF7340]/40", pct: 75  },
        { label: "Qualified & Demo", value: qualifiedLeads,               color: "from-[#2A4A3E] to-emerald-600",       pct: 50  },
        { label: "Won Deals",        value: wonLeads,                     color: "from-emerald-700 to-green-600",       pct: 25  }
      ];

      return res.json({
        summary: {
          totalLeads,
          qualifiedLeads,
          wonLeads,
          leadsToday,
          hotLeads,
          fireLeads,
          pendingHandoffs,
          pendingAppointments,
          pendingTasks,
          optOutCount,
          conversionRate,
          avgResponseTime: '< 5s',
          intentBreakdown,
        },
        pipeline,
        recentActivity
      });

    } catch (error) {
      console.error('Analytics query error:', error);
      return res.status(500).json({ error: 'Internal server error calculating metrics' });
    }
  },

  // GET /api/analytics/audit — audit logs
  async getAuditLogs(req: Request, res: Response) {
    try {
      const db = getDb();
      const { limit = 50 } = req.query;
      const logs = await db.all(
        `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`,
        [Number(limit)]
      );
      return res.json(logs);
    } catch (error) {
      console.error('Audit logs query error:', error);
      return res.status(500).json({ error: 'Internal server error fetching audit logs' });
    }
  },

  // GET /api/analytics/lead-funnel — conversion funnel
  async getLeadFunnel(req: Request, res: Response) {
    try {
      const db = getDb();
      const rows = await db.all(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN ai_score >= 1  THEN 1 ELSE 0 END) as engaged,
          SUM(CASE WHEN ai_score >= 40 THEN 1 ELSE 0 END) as warm,
          SUM(CASE WHEN ai_score >= 70 THEN 1 ELSE 0 END) as hot,
          SUM(CASE WHEN ai_score >= 85 THEN 1 ELSE 0 END) as fire,
          SUM(CASE WHEN appointment_requested = 1 THEN 1 ELSE 0 END) as appointment_requested,
          SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won
        FROM leads
        WHERE opt_out = 0
      `);
      return res.json(rows[0] || {});
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get lead funnel' });
    }
  },

  // GET /api/analytics/package-distribution — package recommendations
  async getPackageDistribution(req: Request, res: Response) {
    try {
      const db = getDb();
      const rows = await db.all(`
        SELECT recommended_package, COUNT(*) as count
        FROM leads
        WHERE recommended_package IS NOT NULL
        GROUP BY recommended_package
        ORDER BY count DESC
      `);
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get package distribution' });
    }
  },

  // GET /api/analytics/handoff-stats — handoff rate and resolution
  async getHandoffStats(req: Request, res: Response) {
    try {
      const db = getDb();
      const total = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM handoff_alerts');
      const pending = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM handoff_alerts WHERE status = 'pending'");
      const resolved = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM handoff_alerts WHERE status = 'resolved'");
      const recent = await db.all(`
        SELECT h.*, l.name as lead_name, l.phone as lead_phone, l.ai_score
        FROM handoff_alerts h
        JOIN leads l ON h.lead_id = l.id
        ORDER BY h.created_at DESC
        LIMIT 10
      `);
      return res.json({
        total: total?.count || 0,
        pending: pending?.count || 0,
        resolved: resolved?.count || 0,
        recent
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get handoff stats' });
    }
  },

  // GET /api/analytics/cost-daily — daily AI token spend
  async getCostDaily(req: Request, res: Response) {
    try {
      const db = getDb();
      const rows = await db.all(`
        SELECT
          date(timestamp, 'localtime') as day,
          SUM(cost_usd) as total_cost_usd,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          COUNT(*) as total_calls
        FROM token_usage
        GROUP BY date(timestamp, 'localtime')
        ORDER BY day DESC
        LIMIT 30
      `);
      const grandTotal = await db.get<{ total: number }>('SELECT SUM(cost_usd) as total FROM token_usage');
      return res.json({ daily: rows, grand_total_usd: grandTotal?.total || 0 });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get cost data' });
    }
  },

  // GET /api/analytics/opt-out-rate — compliance metric
  async getOptOutRate(req: Request, res: Response) {
    try {
      const db = getDb();
      const total = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM leads');
      const optOut = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE opt_out = 1');
      const optOutLeads = await db.all(`
        SELECT id, name, phone, created_at
        FROM leads WHERE opt_out = 1
        ORDER BY updated_at DESC LIMIT 20
      `);
      const rate = (total?.count || 0) > 0
        ? Math.round(((optOut?.count || 0) / (total?.count || 1)) * 100 * 100) / 100
        : 0;
      return res.json({
        total_leads: total?.count || 0,
        opt_out_count: optOut?.count || 0,
        opt_out_rate_pct: rate,
        recent_opt_outs: optOutLeads
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get opt-out rate' });
    }
  },
};
