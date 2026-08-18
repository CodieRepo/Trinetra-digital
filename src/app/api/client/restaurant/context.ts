import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Custom error class for restaurant context resolution failures.
 * Allows callers to distinguish auth/IDOR errors from generic errors.
 */
export class RestaurantContextError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RestaurantContextError";
    this.status = status;
  }
}

/**
 * Resolves the authenticated restaurant context for API requests.
 *
 * SECURITY MODEL (H-2A P0-1 + P0-12):
 * - Authenticated users: tenant_id is derived from their database permissions ONLY.
 *   Client-supplied restaurant_id/tenant_id are validated against the authenticated scope.
 *   Mismatches are rejected with 403.
 * - Unauthenticated users: restricted to explicitly public/demo context.
 *   No privileged operations allowed — callers should check isAuthenticated.
 */
export async function resolveRestaurantContext(request: Request, bodyData?: any): Promise<{
  tenantId: string | null;
  restaurantId: string | null;
  isAuthenticated: boolean;
}> {
  const url = new URL(request.url);
  const db = getSupabaseAdmin();

  // ─── Step 1: Authenticate the user (Supabase user or Staff JWT) ─────────────
  let userId: string | null = null;

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    
    // Check if Bearer token is a signed Staff JWT
    try {
      const { verifyStaffJwt } = await import("@/lib/crypto/auth-tokens");
      const jwtPayload = verifyStaffJwt(token);
      if (jwtPayload) {
        const { data: staffRecord } = await db
          .from("restaurant_staff")
          .select("id, is_active, tenant_id, restaurant_id")
          .eq("id", jwtPayload.staff_id)
          .eq("restaurant_id", jwtPayload.restaurant_id)
          .maybeSingle();

        if (!staffRecord || !staffRecord.is_active) {
          throw new RestaurantContextError("Forbidden: Staff account has been deactivated.", 403);
        }

        const requestedTenantId = url.searchParams.get("tenant_id") || request.headers.get("x-tenant-id") || bodyData?.tenant_id;
        const requestedRestaurantId = url.searchParams.get("restaurant_id") || request.headers.get("x-restaurant-id") || bodyData?.restaurant_id;

        if (requestedTenantId && requestedTenantId !== "default" && requestedTenantId.trim() !== staffRecord.tenant_id) {
          throw new RestaurantContextError("Forbidden: Tenant ID mismatch with authenticated staff identity.", 403);
        }
        if (requestedRestaurantId && requestedRestaurantId !== "default" && requestedRestaurantId.trim() !== staffRecord.restaurant_id) {
          throw new RestaurantContextError("Forbidden: Restaurant ID mismatch with authenticated staff identity.", 403);
        }

        return {
          tenantId: staffRecord.tenant_id,
          restaurantId: staffRecord.restaurant_id,
          isAuthenticated: true,
        };
      }
    } catch (jwtErr) {
      if (jwtErr instanceof RestaurantContextError) throw jwtErr;
    }

    try {
      const { data: { user } } = await db.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    } catch (authErr) {
      console.warn("[ContextResolver] Bearer token inspection failed:", authErr);
    }
  }

  // Fallback: Server session via cookies
  if (!userId) {
    try {
      const supabaseServer = await createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (e) {
      // Cookie session lookup failed
    }
  }

  // ─── Step 2: Resolve verified tenant from authenticated identity ─────────────
  let verifiedTenantId: string | null = null;

  if (userId) {
    const { data: roleData } = await db
      .from("users_roles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.tenant_id) {
      verifiedTenantId = roleData.tenant_id;
    } else {
      const { data: profile } = await db
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.tenant_id) {
        verifiedTenantId = profile.tenant_id;
      }
    }
  }

  // ─── Step 3: Resolve restaurant context ──────────────────────────────────────
  const requestedTenantId = url.searchParams.get("tenant_id") || request.headers.get("x-tenant-id") || bodyData?.tenant_id;
  const requestedRestaurantId = url.searchParams.get("restaurant_id") || request.headers.get("x-restaurant-id") || bodyData?.restaurant_id;

  // ─── AUTHENTICATED PATH ──────────────────────────────────────────────────────
  if (userId && verifiedTenantId) {
    const tenantId: string = verifiedTenantId;
    let restaurantId: string | null = null;

    // If client supplies a restaurant_id, validate it belongs to the authenticated tenant
    if (requestedRestaurantId && requestedRestaurantId !== "default") {
      const { data: restRow } = await db
        .from("restaurants")
        .select("id, tenant_id")
        .eq("id", requestedRestaurantId.trim())
        .maybeSingle();

      if (!restRow) {
        throw new RestaurantContextError("Forbidden: Requested restaurant not found.", 403);
      }

      if (restRow.tenant_id !== verifiedTenantId) {
        // IDOR BLOCKED: authenticated user attempting cross-tenant access
        throw new RestaurantContextError(
          "Forbidden: You do not have permission to access this restaurant.",
          403
        );
      }

      restaurantId = restRow.id;
    }

    // If client supplies a tenant_id, it must match the authenticated tenant
    if (requestedTenantId && requestedTenantId !== "default" && requestedTenantId.trim() !== verifiedTenantId) {
      throw new RestaurantContextError(
        "Forbidden: Tenant ID mismatch with authenticated identity.",
        403
      );
    }

    // If no specific restaurant requested, resolve from authenticated tenant
    if (!restaurantId) {
      const { data: restRow } = await db
        .from("restaurants")
        .select("id, tenant_id")
        .eq("tenant_id", verifiedTenantId)
        .limit(1)
        .maybeSingle();

      if (restRow) {
        restaurantId = restRow.id;
      }
    }

    return { tenantId, restaurantId, isAuthenticated: true };
  }

  // ─── UNAUTHENTICATED PATH (public/demo context only) ────────────────────────
  // No privileged operations should be possible here.
  // Routes that require auth should check isAuthenticated.
  let tenantId: string | null = null;
  let restaurantId: string | null = null;

  // Allow explicit restaurant_id for public flows (e.g., QR menu loading via admin panel)
  if (requestedRestaurantId && requestedRestaurantId !== "default") {
    const { data: restRow } = await db
      .from("restaurants")
      .select("id, tenant_id")
      .eq("id", requestedRestaurantId.trim())
      .maybeSingle();

    if (restRow) {
      restaurantId = restRow.id;
      tenantId = restRow.tenant_id;
    }
  }

  // Fallback to demo tenant for unauthenticated browsing
  if (!tenantId) {
    tenantId = "00000000-0000-0000-0000-000000000001";
  }

  if (!restaurantId) {
    const { data: demoRest } = await db
      .from("restaurants")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    restaurantId = demoRest?.id || null;
  }

  return { tenantId, restaurantId, isAuthenticated: false };
}

export { requireStaffRole, resolveCallerIdentity } from "@/lib/auth/role-guard";
