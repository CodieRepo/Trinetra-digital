import { verifyStaffJwt, StaffJwtPayload } from "../crypto/auth-tokens";
import { getSupabaseAdmin } from "../supabase/admin";

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
 * Authenticates a staff request using signed Staff JWT or legacy access_token.
 * Enforces cross-tenant and cross-restaurant parameter spoofing protection.
 */
export async function authenticateStaffRequest(
  request: Request,
  bodyData?: any,
  requestedRestaurantId?: string | null
): Promise<{ context: VerifiedStaffContext | null; errorResponse?: { message: string; status: number } }> {
  const token = extractStaffToken(request, bodyData);
  if (!token) {
    return { context: null, errorResponse: { message: "Unauthorized: Missing Bearer token", status: 401 } };
  }

  // 1. Try decoding as signed Staff JWT first
  const jwtPayload: StaffJwtPayload | null = verifyStaffJwt(token);

  let staffContext: VerifiedStaffContext | null = null;

  if (jwtPayload) {
    // Verify staff is still active in the database (guards against deactivated staff with valid JWT)
    const db = getSupabaseAdmin();
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
  } else {
    // 2. Fallback to legacy database access_token lookup for backward compatibility
    try {
      const db = getSupabaseAdmin();
      const { data: staff, error: staffErr } = await db
        .from("restaurant_staff")
        .select("id, tenant_id, restaurant_id, name, role, is_active")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (staffErr || !staff) {
        return { context: null, errorResponse: { message: "Unauthorized: Invalid or expired staff token", status: 401 } };
      }

      staffContext = {
        staff_id: staff.id,
        tenant_id: staff.tenant_id,
        restaurant_id: staff.restaurant_id,
        name: staff.name,
        role: staff.role,
        is_active: staff.is_active,
      };
    } catch (dbErr) {
      return { context: null, errorResponse: { message: "Unauthorized: Invalid or expired staff token", status: 401 } };
    }
  }

  // 3. Strict Parameter Spoofing Check: If client provides restaurant_id, it MUST match authorized staffContext
  if (requestedRestaurantId && requestedRestaurantId.trim() && requestedRestaurantId.trim() !== staffContext.restaurant_id) {
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
