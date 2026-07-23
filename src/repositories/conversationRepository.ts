import { getSupabaseAdmin } from "../lib/supabase/admin";
import { ConversationMessage } from "../types/crm";

export class ConversationRepository {
  private db = getSupabaseAdmin();

  async findByMetaMessageId(metaMessageId: string): Promise<ConversationMessage | null> {
    const { data } = await this.db
      .from("bhash_conversations")
      .select("*")
      .eq("meta_message_id", metaMessageId)
      .maybeSingle();

    if (data) return data as ConversationMessage;

    const { data: msgData } = await this.db
      .from("messages")
      .select("*")
      .eq("provider_message_id", metaMessageId)
      .maybeSingle();

    if (msgData) {
      return {
        id: msgData.id,
        lead_id: msgData.lead_id,
        direction: msgData.direction,
        message: msgData.body,
        timestamp: msgData.created_at,
        created_at: msgData.created_at,
      } as ConversationMessage;
    }

    return null;
  }

  async saveMessage(msg: {
    tenant_id?: string;
    lead_id: string;
    direction: "inbound" | "outbound";
    message: string;
    flow_node?: string | null;
    button_clicked?: string | null;
    meta_message_id?: string | null;
    timestamp?: string;
  }): Promise<ConversationMessage> {
    const timestampStr = msg.timestamp || new Date().toISOString();

    const { data, error } = await this.db
      .from("bhash_conversations")
      .insert({
        lead_id: msg.lead_id,
        direction: msg.direction,
        message: msg.message,
        flow_node: msg.flow_node || null,
        button_clicked: msg.button_clicked || null,
        meta_message_id: msg.meta_message_id || null,
        timestamp: timestampStr,
      })
      .select("*")
      .single();

    if (error) {
      console.error("ConversationRepository.saveMessage error:", error);
    }

    try {
      await this.db.from("messages").insert({
        lead_id: msg.lead_id,
        direction: msg.direction,
        body: msg.message,
        provider_message_id: msg.meta_message_id || null,
        created_at: timestampStr,
      });
    } catch (e) {}

    return (data as ConversationMessage) || {
      id: `msg-${Date.now()}`,
      lead_id: msg.lead_id,
      direction: msg.direction,
      message: msg.message,
      timestamp: timestampStr,
    };
  }

  async getMessagesByLeadId(leadId: string, limit = 100): Promise<ConversationMessage[]> {
    const { data: bhashMsgs } = await this.db
      .from("bhash_conversations")
      .select("*")
      .eq("lead_id", leadId)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (bhashMsgs && bhashMsgs.length > 0) {
      return bhashMsgs as ConversationMessage[];
    }

    // Fallback query to messages table
    const { data: msgs } = await this.db
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (msgs && msgs.length > 0) {
      return msgs.map((m) => ({
        id: m.id,
        lead_id: m.lead_id,
        direction: m.direction,
        message: m.body,
        flow_node: null,
        button_clicked: null,
        meta_message_id: m.provider_message_id,
        timestamp: m.created_at,
        created_at: m.created_at,
      }));
    }

    return [];
  }
}

export const conversationRepository = new ConversationRepository();
