import { getSupabaseAdmin } from "../lib/supabase/admin";

export class NotificationService {
  async notify(params: {
    tenant_id?: string;
    lead_id?: string;
    type: string;
    title: string;
    message: string;
    channel?: string;
  }) {
    const db = getSupabaseAdmin();
    try {
      await db.from("notifications").insert({
        tenant_id: params.tenant_id || "00000000-0000-0000-0000-000000000001",
        lead_id: params.lead_id || null,
        type: params.type,
        title: params.title,
        message: params.message,
        channel: params.channel || "in_app",
      });
    } catch (err) {
      console.error("Failed to write notification:", err);
    }
  }
}

export const notificationService = new NotificationService();
