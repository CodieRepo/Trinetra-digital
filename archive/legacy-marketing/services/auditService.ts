import { getSupabaseAdmin } from "../lib/supabase/admin";

export class AuditService {
  async logAction(params: {
    tenant_id?: string;
    entity_type: string;
    entity_id: string;
    actor: string;
    action: string;
    old_value?: any;
    new_value?: any;
    ip_address?: string;
  }) {
    const db = getSupabaseAdmin();
    try {
      await db.from("audit_logs").insert({
        tenant_id: params.tenant_id || "00000000-0000-0000-0000-000000000001",
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        actor: params.actor,
        action: params.action,
        old_value: params.old_value || null,
        new_value: params.new_value || null,
        ip_address: params.ip_address || null,
      });
    } catch (err) {
      console.error("Failed to record audit log:", err);
    }
  }
}

export const auditService = new AuditService();
