import { NextResponse, NextRequest } from "next/server";
import { resolveTenantId } from "../../../../../lib/auth/tenantContext";
import { UserRole } from "../../../../../types/crm";
import { hasPermission } from "../../../../../lib/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tenant_id = resolveTenantId(request);

  // In production, user_id and role are extracted from Supabase Auth session token
  const role: UserRole = "admin";
  const user_id = "00000000-0000-0000-0000-000000000000";

  const permissions = [
    "view_leads", "edit_leads", "delete_leads", "restore_leads",
    "manage_tasks", "view_analytics", "manage_settings",
    "manage_prompts", "view_audit_logs", "manage_team"
  ].filter((p) => hasPermission(role, p as any));

  return NextResponse.json({
    success: true,
    user: {
      id: user_id,
      tenant_id,
      role,
      permissions,
    },
  });
}
