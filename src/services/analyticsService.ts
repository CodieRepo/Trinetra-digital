import { getSupabaseAdmin } from "../lib/supabase/admin";
import { DashboardMetrics } from "../types/crm";

export class AnalyticsService {
  private db = getSupabaseAdmin();

  async getDashboardAnalytics(): Promise<DashboardMetrics> {
    try {
      // 1. Leads breakdown
      const { data: leads, error: leadsErr } = await this.db
        .from("leads")
        .select("id, status, service_interest, current_flow_node, created_at");

      if (leadsErr) throw leadsErr;
      const allLeads = leads || [];

      const totalLeads = allLeads.length;
      const liveLeads = allLeads.filter(l => l.status === "new" || l.status === "nurturing" || l.status === "Interested").length;
      const hotLeads = allLeads.filter(l => l.status === "hot").length;
      const interestedLeads = allLeads.filter(l => l.status === "Interested").length;

      const todayStr = new Date().toISOString().split("T")[0];
      const todayLeads = allLeads.filter(l => l.created_at.startsWith(todayStr)).length;

      // 2. Timeline events aggregation
      const { data: events } = await this.db
        .from("bhash_timeline_events")
        .select("event_type, metadata");

      const allEvents = events || [];

      const pricingRequests = allEvents.filter(e => e.event_type === "viewed_pricing").length;
      const portfolioViews = allEvents.filter(e => e.event_type === "visited_portfolio").length;
      const contactRequests = allEvents.filter(e => e.event_type === "requested_contact").length;

      // 3. Most Clicked Service
      const serviceCounts: Record<string, number> = {};
      allLeads.forEach(l => {
        if (l.service_interest) {
          serviceCounts[l.service_interest] = (serviceCounts[l.service_interest] || 0) + 1;
        }
      });

      let topService: { service: string; count: number } | null = null;
      let maxCount = 0;
      Object.entries(serviceCounts).forEach(([srv, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topService = { service: srv, count };
        }
      });

      // 4. Drop-off node analysis
      const nodeCounts: Record<string, number> = {};
      allLeads.forEach(l => {
        if (l.current_flow_node) {
          nodeCounts[l.current_flow_node] = (nodeCounts[l.current_flow_node] || 0) + 1;
        }
      });

      let topDropoff: { node: string; count: number } | null = null;
      let maxDropoff = 0;
      Object.entries(nodeCounts).forEach(([n, c]) => {
        if (c > maxDropoff) {
          maxDropoff = c;
          topDropoff = { node: n, count: c };
        }
      });

      // 5. Conversion rate (% of leads that reached Interested status or Contact Request)
      const convertedCount = interestedLeads + allLeads.filter(l => l.status === "converted").length;
      const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

      return {
        totalLeads,
        liveLeads,
        unreadChats: liveLeads,
        hotLeads,
        interestedLeads,
        todayLeads,
        pricingRequests,
        portfolioViews,
        contactRequests,
        mostClickedService: topService,
        mostViewedPricingNode: { node: "6225", count: pricingRequests },
        topDropoffNode: topDropoff,
        conversionRate,
      };
    } catch (err) {
      console.error("AnalyticsService error:", err);
      return {
        totalLeads: 0,
        liveLeads: 0,
        unreadChats: 0,
        hotLeads: 0,
        interestedLeads: 0,
        todayLeads: 0,
        pricingRequests: 0,
        portfolioViews: 0,
        contactRequests: 0,
        mostClickedService: null,
        mostViewedPricingNode: null,
        topDropoffNode: null,
        conversionRate: 0,
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
