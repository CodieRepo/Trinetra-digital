import { Request, Response } from 'express';
import { getDb } from '../database/connection';

export const AnalyticsController = {
  // GET /api/analytics
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

      // Conversion rate
      const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

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
        { label: "New Leads", value: newLeadsCount?.count || 0, color: "from-[#BF7340] to-orange-400", pct: 100 },
        { label: "AI Qualifying", value: aiQualifyingCount?.count || 0, color: "from-[#BF7340]/80 to-[#BF7340]/40", pct: 75 },
        { label: "Qualified & Demo", value: qualifiedLeads, color: "from-[#2A4A3E] to-emerald-600", pct: 50 },
        { label: "Won Deals", value: wonLeads, color: "from-emerald-700 to-green-600", pct: 25 }
      ];

      return res.json({
        summary: {
          totalLeads,
          qualifiedLeads,
          wonLeads,
          leadsToday,
          conversionRate,
          avgResponseTime: '22s' // Baseline indicator
        },
        pipeline,
        recentActivity
      });

    } catch (error) {
      console.error('Analytics query error:', error);
      return res.status(500).json({ error: 'Internal server error calculating metrics' });
    }
  }
};
