import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function resolveRestaurantContext(request: Request, bodyData?: any) {
  const url = new URL(request.url);
  
  // 1. Resolve tenant_id (from search param, header, body, or default fallback)
  let tenantId = url.searchParams.get("tenant_id");
  if (!tenantId) tenantId = request.headers.get("x-tenant-id");
  if (!tenantId && bodyData?.tenant_id) tenantId = bodyData.tenant_id;
  if (!tenantId) {
    tenantId = "00000000-0000-0000-0000-000000000001"; // Default system tenant
  }
  
  // 2. Resolve restaurant_id (from search param, header, body, or database lookup)
  let restaurantId = url.searchParams.get("restaurant_id");
  if (!restaurantId) restaurantId = request.headers.get("x-restaurant-id");
  if (!restaurantId && bodyData?.restaurant_id) restaurantId = bodyData.restaurant_id;
  
  if (!restaurantId || restaurantId === "default") {
    // Look up the first restaurant associated with this tenant
    const db = getSupabaseAdmin();
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
