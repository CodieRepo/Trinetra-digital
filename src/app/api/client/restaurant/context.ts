import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function resolveRestaurantContext(request: Request, bodyData?: any) {
  const url = new URL(request.url);
  const db = getSupabaseAdmin();
  
  // 1. Resolve tenant_id (from search param, header, body)
  let tenantId = url.searchParams.get("tenant_id");
  if (!tenantId) tenantId = request.headers.get("x-tenant-id");
  if (!tenantId && bodyData?.tenant_id) tenantId = bodyData.tenant_id;
  
  // 2. Resolve restaurant_id (from search param, header, body)
  let restaurantId = url.searchParams.get("restaurant_id");
  if (!restaurantId) restaurantId = request.headers.get("x-restaurant-id");
  if (!restaurantId && bodyData?.restaurant_id) restaurantId = bodyData.restaurant_id;

  // 3. If tenantId or restaurantId missing, attempt resolution via Authorization Bearer token
  const authHeader = request.headers.get("authorization");
  if ((!tenantId || !restaurantId) && authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7).trim();
      const { data: { user } } = await db.auth.getUser(token);
      if (user) {
        // Query user role / tenant mapping
        const { data: roleData } = await db
          .from("users_roles")
          .select("tenant_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData?.tenant_id) {
          if (!tenantId) tenantId = roleData.tenant_id;
        } else {
          // Fallback legacy profiles check
          const { data: profile } = await db
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.tenant_id && !tenantId) {
            tenantId = profile.tenant_id;
          }
        }
      }
    } catch (authErr) {
      console.warn("[ContextResolver] Bearer token inspection failed:", authErr);
    }
  }

  // 4. Default fallback tenant if still unassigned
  if (!tenantId) {
    tenantId = "00000000-0000-0000-0000-000000000001";
  }
  
  // 5. Look up restaurant if unassigned or 'default'
  if (!restaurantId || restaurantId === "default") {
    const { data, error } = await db
      .from("restaurants")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.warn(`[ContextResolver] Error looking up restaurant for tenant ${tenantId}: ${error.message}`);
    }
    restaurantId = data?.id || null;
  }
  
  return { tenantId, restaurantId };
}

