import { getSupabaseAdmin } from "../lib/supabase/admin";
import { ConversationMessage } from "../types/crm";

export class ConversationRepository {
  private db = getSupabaseAdmin();

  async findByMetaMessageId(metaMessageId: string): Promise<ConversationMessage | null> {
    const { data, error } = await this.db
      .from("bhash_conversations")
      .select("*")
      .eq("meta_message_id", metaMessageId)
      .maybeSingle();

    if (error) {
      console.error("ConversationRepository.findByMetaMessageId error:", error);
      return null;
    }
    return data as ConversationMessage | null;
  }

  async saveMessage(msg: {
    lead_id: string;
    direction: "inbound" | "outbound";
    message: string;
    flow_node?: string | null;
    button_clicked?: string | null;
    meta_message_id?: string | null;
    timestamp?: string;
  }): Promise<ConversationMessage> {
    const { data, error } = await this.db
      .from("bhash_conversations")
      .insert({
        lead_id: msg.lead_id,
        direction: msg.direction,
        message: msg.message,
        flow_node: msg.flow_node || null,
        button_clicked: msg.button_clicked || null,
        meta_message_id: msg.meta_message_id || null,
        timestamp: msg.timestamp || new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("ConversationRepository.saveMessage error:", error);
      throw error;
    }
    return data as ConversationMessage;
  }

  async getMessagesByLeadId(leadId: string, limit = 100): Promise<ConversationMessage[]> {
    const { data, error } = await this.db
      .from("bhash_conversations")
      .select("*")
      .eq("lead_id", leadId)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("ConversationRepository.getMessagesByLeadId error:", error);
      return [];
    }
    return (data || []) as ConversationMessage[];
  }
}

export const conversationRepository = new ConversationRepository();
