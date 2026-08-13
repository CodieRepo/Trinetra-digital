import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function resolveRestaurantContext(request: Request, bodyData?: any) {
  const url = new URL(request.url);
  const db = getSupabaseAdmin();
  let verifiedTenantId: string | null = null;

  // 1. First, attempt resolution via Authorization Bearer token or cookie session
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7).trim();
      const { data: { user } } = await db.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    } catch (authErr) {
      console.warn("[ContextResolver] Bearer token inspection failed:", authErr);
    }
  }

  // Fallback check: Server session via cookies
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

  // 2. If authenticated user found, derive tenant_id strictly from database permissions
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

  // 3. Request param inspection & Database context resolution
  const requestedTenantId = url.searchParams.get("tenant_id") || request.headers.get("x-tenant-id") || bodyData?.tenant_id;
  const requestedRestaurantId = url.searchParams.get("restaurant_id") || request.headers.get("x-restaurant-id") || bodyData?.restaurant_id;

  let tenantId: string | null = null;
  let restaurantId: string | null = null;

  // Option A: Explicit requestedRestaurantId provided
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

  // Option B: Explicit requestedTenantId provided
  if (!restaurantId && requestedTenantId && requestedTenantId !== "default") {
    const { data: restRow } = await db
      .from("restaurants")
      .select("id, tenant_id")
      .eq("tenant_id", requestedTenantId.trim())
      .limit(1)
      .maybeSingle();

    if (restRow) {
      restaurantId = restRow.id;
      tenantId = restRow.tenant_id;
    } else {
      tenantId = requestedTenantId;
    }
  }

  // Option C: Authenticated user context fallback
  if (!restaurantId && verifiedTenantId) {
    const { data: restRow } = await db
      .from("restaurants")
      .select("id, tenant_id")
      .eq("tenant_id", verifiedTenantId)
      .limit(1)
      .maybeSingle();

    if (restRow) {
      restaurantId = restRow.id;
      tenantId = restRow.tenant_id;
    } else {
      tenantId = verifiedTenantId;
    }
  }

  // Option D: Public / Unauthenticated fallback to default demo tenant
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

  return { tenantId, restaurantId };
}
