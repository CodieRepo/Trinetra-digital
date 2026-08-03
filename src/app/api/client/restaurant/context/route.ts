import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

    // 1. Verify user session via Supabase Auth
    const { data: { user }, error: userError } = await db.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired session token" }, { status: 401 });
    }

    // 2. Fetch role and tenant_id from users_roles
    let tenantId: string | null = null;
    let role: string = "owner";

    const { data: roleRows } = await db
      .from("users_roles")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .limit(1);

    if (roleRows && roleRows.length > 0) {
      tenantId = roleRows[0].tenant_id;
      role = roleRows[0].role;
    } else {
      // Fallback check legacy profiles
      const { data: profileRows } = await db
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", user.id)
        .limit(1);

      if (profileRows && profileRows.length > 0) {
        tenantId = profileRows[0].tenant_id;
        role = profileRows[0].role === "client_admin" ? "admin" : (profileRows[0].role || "owner");
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Account is not mapped to any Restaurant Organization." }, { status: 404 });
    }

    // 3. Fetch restaurant details
    const { data: restaurants, error: restErr } = await db
      .from("restaurants")
      .select("*")
      .eq("tenant_id", tenantId.trim())
      .limit(1);

    const restaurant = restaurants && restaurants.length > 0 ? restaurants[0] : null;

    if (restErr || !restaurant) {
      console.error("[Context API] Restaurant fetch failed for tenant:", tenantId, "Err:", restErr);
      return NextResponse.json({
        error: "No active Restaurant Profile found for your Organization.",
        details: restErr?.message || "No row matched tenant_id",
        tenant_id: tenantId
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      tenant_id: tenantId,
      role: role,
      restaurant: restaurant,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
