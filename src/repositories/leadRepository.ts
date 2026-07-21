import { getSupabaseAdmin } from "../lib/supabase/admin";
import { Lead, LeadStatus } from "../types/crm";

export class LeadRepository {
  private db = getSupabaseAdmin();

  async findByPhone(phone: string): Promise<Lead | null> {
    const { data, error } = await this.db
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error("LeadRepository.findByPhone error:", error);
      throw error;
    }
    return data as Lead | null;
  }

  async findById(id: string): Promise<Lead | null> {
    const { data, error } = await this.db
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("LeadRepository.findById error:", error);
      throw error;
    }
    return data as Lead | null;
  }

  async createLead(lead: {
    phone: string;
    name?: string;
    service_interest?: string | null;
    current_flow_node?: string;
    last_message?: string | null;
    status?: LeadStatus;
    source?: string;
  }): Promise<Lead> {
    const { data, error } = await this.db
      .from("leads")
      .insert({
        phone: lead.phone,
        name: lead.name || `WhatsApp Lead (${lead.phone.slice(-4)})`,
        service_interest: lead.service_interest || null,
        current_flow_node: lead.current_flow_node || "6206",
        last_message: lead.last_message || null,
        last_message_at: new Date().toISOString(),
        status: lead.status || "new",
        source: lead.source || "WhatsApp",
      })
      .select("*")
      .single();

    if (error) {
      console.error("LeadRepository.createLead error:", error);
      throw error;
    }
    return data as Lead;
  }

  async updateLead(
    id: string,
    updates: Partial<{
      name: string;
      service_interest: string | null;
      current_flow_node: string;
      last_message: string | null;
      last_message_at: string;
      status: LeadStatus;
    }>
  ): Promise<Lead> {
    const { data, error } = await this.db
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("LeadRepository.updateLead error:", error);
      throw error;
    }
    return data as Lead;
  }

  async getAllLeads(limit = 100): Promise<Lead[]> {
    const { data, error } = await this.db
      .from("leads")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("LeadRepository.getAllLeads error:", error);
      return [];
    }
    return (data || []) as Lead[];
  }
}

export const leadRepository = new LeadRepository();
