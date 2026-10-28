import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext, RestaurantContextError } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing Bearer token" }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const db = getSupabaseAdmin();

    // 1. Resolve and verify tenant and restaurant context (blocks IDOR parameter spoofing)
    const context = await resolveRestaurantContext(request);
    if (!context.isAuthenticated || !context.tenantId) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired session token" }, { status: 401 });
    }

    // 2. Fetch authenticated user details
    const { data: { user }, error: userError } = await db.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired session token" }, { status: 401 });
    }

    // 3. Resolve user role for the verified tenant
    let role = "owner";
    const [roleRows, profileRow] = await Promise.all([
      db.from("users_roles").select("role").eq("user_id", user.id).eq("tenant_id", context.tenantId).maybeSingle(),
      db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);

    if (roleRows.data?.role) {
      role = roleRows.data.role;
    } else if (profileRow.data?.role) {
      role = profileRow.data.role === "client_admin" ? "admin" : (profileRow.data.role || "owner");
    }

    // 4. Fetch restaurant details
    let query = db.from("restaurants").select("*");
    if (context.restaurantId) {
      query = query.eq("id", context.restaurantId);
    } else {
      query = query.eq("tenant_id", context.tenantId);
    }

    const { data: restaurants, error: restErr } = await query.limit(1);
    const restaurant = restaurants && restaurants.length > 0 ? restaurants[0] : null;

    if (restErr || !restaurant) {
      return NextResponse.json({
        error: "No active Restaurant Profile found for your Organization.",
        details: restErr?.message || "No row matched tenant_id",
        tenant_id: context.tenantId
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      tenant_id: restaurant.tenant_id || context.tenantId,
      role: role,
      restaurant: restaurant,
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
