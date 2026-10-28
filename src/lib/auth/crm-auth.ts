import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export interface CrmAuthContext {
  isAuthorized: boolean;
  userId?: string;
  tenantId?: string;
  role?: string;
  isSuperAdmin?: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Server-side authorization guard for Trinetra CRM routes.
 * Strictly verifies identity via Bearer JWT or Supabase cookie session.
 * Enforces verified tenant membership and blocks cross-tenant parameter spoofing.
 */
export async function verifyAuthenticatedCrmUser(request: Request): Promise<CrmAuthContext> {
  const db = getSupabaseAdmin();
  let authUser: any = null;

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    try {
      const { data: { user } } = await db.auth.getUser(token);
      if (user) authUser = user;
    } catch {}
  }

  if (!authUser) {
    try {
      const supabaseServer = await createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) authUser = user;
    } catch {}
  }

  if (!authUser) {
    return {
      isAuthorized: false,
      error: "Unauthorized: Authentication required",
      statusCode: 401,
    };
  }

  const userId = authUser.id;

  // Query user roles and profile for verified tenant_id
  const [roleRes, profileRes] = await Promise.all([
    db.from("users_roles").select("tenant_id, role").eq("user_id", userId),
    db.from("profiles").select("tenant_id, role").eq("id", userId).maybeSingle(),
  ]);

  const roleRows = roleRes.data || [];
  const profile = profileRes.data;

  const isSuperAdmin = Boolean(
    profile?.role === "super_admin" ||
    profile?.role === "client_admin" ||
    roleRows.some((r: any) => r.role === "super_admin" || r.role === "client_admin")
  );

  let verifiedTenantId: string | null = null;
  if (roleRows.length > 0) {
    verifiedTenantId = roleRows[0].tenant_id;
  } else if (profile?.tenant_id) {
    verifiedTenantId = profile.tenant_id;
  }

  if (!verifiedTenantId && !isSuperAdmin) {
    return {
      isAuthorized: false,
      error: "Forbidden: No verified tenant membership found",
      statusCode: 403,
    };
  }

  // Cross-tenant spoofing check
  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get("tenant_id") || request.headers.get("x-tenant-id");

  if (requestedTenantId && requestedTenantId.trim()) {
    const cleanRequested = requestedTenantId.trim();
    if (!isSuperAdmin && cleanRequested !== verifiedTenantId) {
      return {
        isAuthorized: false,
        error: "Forbidden: Cross-tenant access denied",
        statusCode: 403,
      };
    }
  }

  const effectiveTenantId = (isSuperAdmin && requestedTenantId) ? requestedTenantId.trim() : verifiedTenantId!;

  return {
    isAuthorized: true,
    userId,
    tenantId: effectiveTenantId,
    role: profile?.role || roleRows[0]?.role || "staff",
    isSuperAdmin,
  };
}
