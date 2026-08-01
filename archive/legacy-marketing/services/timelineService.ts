import { getSupabaseAdmin } from "../lib/supabase/admin";
import { TimelineEvent } from "../types/crm";

export class TimelineService {
  private db = getSupabaseAdmin();

  async logEvent(params: {
    tenant_id?: string;
    lead_id: string;
    event_type: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<TimelineEvent> {
    const tenant_id = params.tenant_id || "00000000-0000-0000-0000-000000000001";

    const { data, error } = await this.db
      .from("timeline_events")
      .insert({
        tenant_id,
        lead_id: params.lead_id,
        event_type: params.event_type,
        title: params.title,
        description: params.description || null,
        metadata: params.metadata || {},
      })
      .select("*")
      .single();

    if (error) {
      console.error("TimelineService.logEvent error:", error);
      throw error;
    }

    return data as TimelineEvent;
  }

  async getEventsByLeadId(leadId: string, limit = 50): Promise<TimelineEvent[]> {
    const { data, error } = await this.db
      .from("timeline_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("TimelineService.getEventsByLeadId error:", error);
      return [];
    }

    return (data || []) as TimelineEvent[];
  }
}

export const timelineService = new TimelineService();
