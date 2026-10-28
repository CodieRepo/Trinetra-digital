/**
 * Trinetra Restaurant OS — Administrative Authorization Guard
 * File: src/lib/auth/admin-guard.ts
 * Description: Canonical server-side super-admin authorization utility.
 *              Verifies database-backed super_admin/client_admin roles or
 *              dedicated ADMIN_ONBOARDING_KEY server secret.
 *              Does NOT use hardcoded email whitelists and does NOT accept
 *              SUPABASE_SERVICE_ROLE_KEY as a request header.
 */

import { getSupabaseAdmin } from "../supabase/admin";
import { createClient as createServerClient } from "../supabase/server";

export interface AdminAuthResult {
  isAuthorized: boolean;
  userId?: string;
  role?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Validates whether the incoming request is authorized for super-admin operations.
 * Checks for:
 * 1. Dedicated ADMIN_ONBOARDING_KEY secret match in x-admin-key or Authorization header.
 * 2. Authenticated Supabase user session possessing 'super_admin' or 'client_admin' role in DB.
 */
export async function verifySuperAdminAccess(request: Request): Promise<AdminAuthResult> {
  const adminKey = request.headers.get("x-admin-key") || "";
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  // 1. Check dedicated ADMIN_ONBOARDING_KEY server-side secret
  if (process.env.ADMIN_ONBOARDING_KEY && process.env.ADMIN_ONBOARDING_KEY.trim()) {
    const configuredKey = process.env.ADMIN_ONBOARDING_KEY.trim();
    if (adminKey === configuredKey || bearerToken === configuredKey) {
      return { isAuthorized: true, role: "super_admin" };
    }
  }

  const db = getSupabaseAdmin();
  let authUser: any = null;

  // 2. Try resolving user from Bearer JWT token
  if (bearerToken && bearerToken.split(".").length === 3) {
    try {
      const { data: { user } } = await db.auth.getUser(bearerToken);
      if (user) {
        authUser = user;
      }
    } catch {}
  }

  // 3. Fallback to cookie session
  if (!authUser) {
    try {
      const supabaseServer = await createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) {
        authUser = user;
      }
    } catch {}
  }

  if (!authUser) {
    return {
      isAuthorized: false,
      error: "Unauthorized: Authentication required",
      statusCode: 401,
    };
  }

  // 4. Verify database-backed super_admin or client_admin role
  const userId = authUser.id;

  const [rolesRes, profileRes] = await Promise.all([
    db.from("users_roles").select("role").eq("user_id", userId),
    db.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);

  const roleRows = rolesRes.data || [];
  const profileRole = profileRes.data?.role;
  // Role must ONLY be verified from database records, NEVER from client-supplied user_metadata
  const isSuperAdmin = Boolean(
    profileRole === "super_admin" ||
    profileRole === "client_admin" ||
    roleRows.some((r: any) => r.role === "super_admin" || r.role === "client_admin")
  );

  if (isSuperAdmin) {
    return {
      isAuthorized: true,
      userId,
      role: profileRole || (roleRows[0]?.role) || "super_admin",
    };
  }

  return {
    isAuthorized: false,
    error: "Forbidden: Super-admin privileges required for this operation",
    statusCode: 403,
  };
}
