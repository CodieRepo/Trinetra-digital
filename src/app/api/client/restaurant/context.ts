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

  // 3. Request param inspection (Only allow client parameter if it matches verified tenant, or if public access)
  const requestedTenantId = url.searchParams.get("tenant_id") || request.headers.get("x-tenant-id") || bodyData?.tenant_id;
  const requestedRestaurantId = url.searchParams.get("restaurant_id") || request.headers.get("x-restaurant-id") || bodyData?.restaurant_id;

  let tenantId: string;
  if (verifiedTenantId) {
    // If requested tenant matches authorized tenant, accept it. Otherwise enforce authorized tenant!
    if (requestedTenantId && requestedTenantId === verifiedTenantId) {
      tenantId = requestedTenantId;
    } else {
      tenantId = verifiedTenantId;
    }
  } else {
    // Unauthenticated public request fallback (e.g. demo tenant)
    tenantId = requestedTenantId || "00000000-0000-0000-0000-000000000001";
  }

  // 4. Resolve restaurant_id scoped strictly to tenantId
  let restaurantId = requestedRestaurantId;
  if (!restaurantId || restaurantId === "default") {
    const { data } = await db
      .from("restaurants")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
      
    restaurantId = data?.id || null;
  } else {
    // Verify that requested restaurant_id actually belongs to tenantId
    const { data: restCheck } = await db
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!restCheck) {
      // If restaurant doesn't belong to tenant, fallback to tenant's default restaurant
      const { data: defaultRest } = await db
        .from("restaurants")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();

      restaurantId = defaultRest?.id || null;
    }
  }
  
  return { tenantId, restaurantId };
}
