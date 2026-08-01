import { getSupabaseAdmin } from "../lib/supabase/admin";
import { DashboardMetrics } from "../types/crm";

export class AnalyticsService {
  private db = getSupabaseAdmin();

  async getDashboardAnalytics(tenant_id: string = "00000000-0000-0000-0000-000000000001"): Promise<DashboardMetrics & { recentActivities: any[] }> {
    try {
      const { data: leads } = await this.db
        .from("leads")
        .select("*")
        .eq("tenant_id", tenant_id)
        .is("deleted_at", null);

      const allLeads = leads || [];
      const totalLeads = allLeads.length;
      const newLeads = allLeads.filter((l) => l.status === "new").length;
      const qualifiedLeads = allLeads.filter((l) => l.status === "qualified").length;
      const wonLeads = allLeads.filter((l) => l.status === "won" || l.is_customer).length;
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const todayLeads = allLeads.filter((l) => l.created_at?.startsWith(todayStr)).length;

      const { count: pendingTasks } = await this.db
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant_id)
        .eq("status", "pending")
        .is("deleted_at", null);

      const { data: timelineEvents } = await this.db
        .from("timeline_events")
        .select("id, title, description, event_type, created_at, lead_id")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false })
        .limit(10);

      const formattedActivities = (timelineEvents || []).map((te) => ({
        id: te.id,
        title: te.title,
        description: te.description || "",
        timestamp: te.created_at,
        actor: "System",
        type: te.event_type,
      }));

      return {
        totalLeads,
        newLeads,
        qualifiedLeads,
        wonLeads,
        conversionRate,
        pendingTasks: pendingTasks || 0,
        todayLeads,
        weeklyLeads: totalLeads,
        monthlyLeads: totalLeads,
        liveLeads: newLeads,
        interestedLeads: qualifiedLeads,
        hotLeads: allLeads.filter((l) => l.lead_temperature === "hot").length,
        pricingRequests: 0,
        mostClickedService: { service: "Web Development", count: qualifiedLeads },
        mostViewedPricingNode: { node: "6225", count: 5 },
        topDropoffNode: { node: "6206", count: 2 },
        recentActivities: formattedActivities,
      };
    } catch (err) {
      console.error("AnalyticsService error:", err);
      return {
        totalLeads: 0,
        newLeads: 0,
        qualifiedLeads: 0,
        wonLeads: 0,
        conversionRate: 0,
        pendingTasks: 0,
        todayLeads: 0,
        weeklyLeads: 0,
        monthlyLeads: 0,
        liveLeads: 0,
        interestedLeads: 0,
        hotLeads: 0,
        pricingRequests: 0,
        mostClickedService: null,
        mostViewedPricingNode: null,
        topDropoffNode: null,
        recentActivities: [],
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
