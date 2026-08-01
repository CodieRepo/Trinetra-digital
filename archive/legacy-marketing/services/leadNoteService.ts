import { getSupabaseAdmin } from "../lib/supabase/admin";
import { LeadNote } from "../types/crm";

export class LeadNoteService {
  private db = getSupabaseAdmin();

  async addNote(params: {
    tenant_id?: string;
    lead_id: string;
    note: string;
    author?: string;
  }): Promise<LeadNote> {
    const tenant_id = params.tenant_id || "00000000-0000-0000-0000-000000000001";

    const { data, error } = await this.db
      .from("lead_notes")
      .insert({
        tenant_id,
        lead_id: params.lead_id,
        note: params.note,
        author: params.author || "Agent",
      })
      .select("*")
      .single();

    if (error) {
      console.error("LeadNoteService.addNote error:", error);
      throw error;
    }

    return data as LeadNote;
  }

  async getNotesByLeadId(leadId: string, limit = 50): Promise<LeadNote[]> {
    const { data, error } = await this.db
      .from("lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("LeadNoteService.getNotesByLeadId error:", error);
      return [];
    }

    return (data || []) as LeadNote[];
  }
}

export const leadNoteService = new LeadNoteService();
