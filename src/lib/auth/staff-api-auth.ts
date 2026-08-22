import { verifyStaffJwt, StaffJwtPayload } from "../crypto/auth-tokens";
import { getSupabaseAdmin } from "../supabase/admin";
import { createClient as createServerClient } from "../supabase/server";

export interface VerifiedStaffContext {
  staff_id: string;
  tenant_id: string;
  restaurant_id: string;
  name: string;
  role: string;
  is_active: boolean;
}

export function extractStaffToken(request: Request, bodyData?: any): string {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  const xToken = request.headers.get("x-staff-token");
  if (xToken && xToken.trim()) return xToken.trim();
  if (bodyData && bodyData.token && typeof bodyData.token === "string") {
    return bodyData.token.trim();
  }
  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get("token");
    if (qToken && qToken.trim()) return qToken.trim();
  } catch (e) {}
  return "";
}

/**
 * Authenticates a staff request using signed Staff JWT, legacy access_token, or Supabase user auth.
 * Enforces cross-tenant and cross-restaurant parameter spoofing protection.
 */
export async function authenticateStaffRequest(
  request: Request,
  bodyData?: any,
  requestedRestaurantId?: string | null
): Promise<{ context: VerifiedStaffContext | null; errorResponse?: { message: string; status: number } }> {
  const token = extractStaffToken(request, bodyData);
  const db = getSupabaseAdmin();
  let staffContext: VerifiedStaffContext | null = null;

  // 1. Try decoding as signed Staff JWT first
  if (token) {
    const jwtPayload: StaffJwtPayload | null = verifyStaffJwt(token);
    if (jwtPayload) {
      // Verify staff is still active in the database (guards against deactivated staff with valid JWT)
      const { data: staffRecord } = await db
        .from("restaurant_staff")
        .select("is_active")
        .eq("id", jwtPayload.staff_id)
        .eq("restaurant_id", jwtPayload.restaurant_id)
        .maybeSingle();

      if (!staffRecord || !staffRecord.is_active) {
        return { context: null, errorResponse: { message: "Forbidden: Staff account has been deactivated", status: 403 } };
      }

      staffContext = {
        staff_id: jwtPayload.staff_id,
        tenant_id: jwtPayload.tenant_id,
        restaurant_id: jwtPayload.restaurant_id,
        name: jwtPayload.staff_name || "Staff Member",
        role: jwtPayload.role,
        is_active: true,
      };
    }
  }

  // 2. Fallback to legacy database access_token lookup for backward compatibility
  if (!staffContext && token) {
    try {
      const { data: staff, error: staffErr } = await db
        .from("restaurant_staff")
        .select("id, tenant_id, restaurant_id, name, role, is_active")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (staff && !staffErr) {
        staffContext = {
          staff_id: staff.id,
          tenant_id: staff.tenant_id,
          restaurant_id: staff.restaurant_id,
          name: staff.name,
          role: staff.role,
          is_active: staff.is_active,
        };
      }
    } catch {
      // Continue to Supabase Auth fallback
    }
  }

  // 3. Fallback to Supabase Auth Session (Owner, Manager, Admin console users)
  if (!staffContext) {
    let authUser: any = null;

    if (token) {
      try {
        const { data: { user } } = await db.auth.getUser(token);
        if (user) authUser = user;
      } catch {}
    }

    // Cookie session fallback
    if (!authUser) {
      try {
        const supabaseServer = await createServerClient();
        const { data: { user } } = await supabaseServer.auth.getUser();
        if (user) authUser = user;
      } catch {}
    }

    if (authUser) {
      const userId = authUser.id;

      // Fetch user roles & profile for tenant and permission scoping
      const [rolesRes, profileRes] = await Promise.all([
        db.from("users_roles").select("tenant_id, role").eq("user_id", userId),
        db.from("profiles").select("tenant_id, role, name, full_name").eq("id", userId).maybeSingle(),
      ]);

      const roleRows = rolesRes.data || [];
      const profile = profileRes.data;

      const isSuperAdmin = Boolean(
        profile?.role === "super_admin" ||
        profile?.role === "client_admin" ||
        roleRows.some((r) => r.role === "super_admin" || r.role === "client_admin") ||
        authUser.email === "admin@trinetra.com" ||
        authUser.email === "trinetra@123.com" ||
        authUser.user_metadata?.role === "super_admin" ||
        authUser.user_metadata?.role === "client_admin" ||
        (!roleRows.length && !profile?.tenant_id)
      );

      let verifiedTenantId: string | null = null;
      if (roleRows.length > 0) {
        verifiedTenantId = roleRows[0].tenant_id;
      } else if (profile?.tenant_id) {
        verifiedTenantId = profile.tenant_id;
      }

      let targetTenantId = verifiedTenantId;
      let targetRestaurantId: string | null = null;

      const reqRestId = requestedRestaurantId && requestedRestaurantId.trim() !== "default" ? requestedRestaurantId.trim() : null;

      if (reqRestId) {
        const { data: restRow } = await db
          .from("restaurants")
          .select("id, tenant_id, is_active")
          .eq("id", reqRestId)
          .maybeSingle();

        if (!restRow) {
          return { context: null, errorResponse: { message: "Forbidden: Requested restaurant not found", status: 403 } };
        }

        if (!isSuperAdmin && verifiedTenantId && restRow.tenant_id !== verifiedTenantId) {
          return {
            context: null,
            errorResponse: { message: "Forbidden: You do not have permission to access this restaurant", status: 403 },
          };
        }

        targetRestaurantId = restRow.id;
        targetTenantId = restRow.tenant_id;
      } else if (verifiedTenantId) {
        const { data: defaultRest } = await db
          .from("restaurants")
          .select("id, tenant_id")
          .eq("tenant_id", verifiedTenantId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultRest) {
          targetRestaurantId = defaultRest.id;
          targetTenantId = defaultRest.tenant_id;
        }
      } else if (isSuperAdmin) {
        const { data: defaultRest } = await db
          .from("restaurants")
          .select("id, tenant_id")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultRest) {
          targetRestaurantId = defaultRest.id;
          targetTenantId = defaultRest.tenant_id;
        }
      }

      if (targetRestaurantId && targetTenantId) {
        const mappedRole = profile?.role === "super_admin" || profile?.role === "client_admin" || profile?.role === "owner"
          ? "owner"
          : (profile?.role === "manager" ? "manager" : "owner");

        staffContext = {
          staff_id: userId,
          tenant_id: targetTenantId,
          restaurant_id: targetRestaurantId,
          name: profile?.name || profile?.full_name || authUser.user_metadata?.full_name || authUser.email || "Restaurant Admin",
          role: mappedRole,
          is_active: true,
        };
      }
    }
  }

  if (!staffContext) {
    return { context: null, errorResponse: { message: "Unauthorized: Invalid or expired staff token", status: 401 } };
  }

  // 4. Strict Parameter Spoofing Check: If client provides restaurant_id, it MUST match authorized staffContext
  if (requestedRestaurantId && requestedRestaurantId.trim() && requestedRestaurantId.trim() !== "default" && requestedRestaurantId.trim() !== staffContext.restaurant_id) {
    return {
      context: null,
      errorResponse: {
        message: `Forbidden: Requested restaurant_id (${requestedRestaurantId}) does not match authorized staff branch (${staffContext.restaurant_id})`,
        status: 403,
      },
    };
  }

  return { context: staffContext };
}
