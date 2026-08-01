import { getSupabaseAdmin } from "../lib/supabase/admin";
import { TimelineEvent } from "../types/crm";

export class TimelineRepository {
  private db = getSupabaseAdmin();

  async createEvent(event: {
    lead_id: string;
    event_type: string;
    title: string;
    description?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<TimelineEvent> {
    const { data, error } = await this.db
      .from("bhash_timeline_events")
      .insert({
        lead_id: event.lead_id,
        event_type: event.event_type,
        title: event.title,
        description: event.description || null,
        metadata: event.metadata || {},
      })
      .select("*")
      .single();

    if (error) {
      console.error("TimelineRepository.createEvent error:", error);
      throw error;
    }
    return data as TimelineEvent;
  }

  async getEventsByLeadId(leadId: string, limit = 50): Promise<TimelineEvent[]> {
    const { data, error } = await this.db
      .from("bhash_timeline_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("TimelineRepository.getEventsByLeadId error:", error);
      return [];
    }
    return (data || []) as TimelineEvent[];
  }
}

export const timelineRepository = new TimelineRepository();
