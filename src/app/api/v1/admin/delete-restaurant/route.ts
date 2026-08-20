import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifyAdminAccess(request: Request): Promise<boolean> {
  const adminKey = request.headers.get("x-admin-key") || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (process.env.ADMIN_ONBOARDING_KEY && (adminKey === process.env.ADMIN_ONBOARDING_KEY || bearerToken === process.env.ADMIN_ONBOARDING_KEY)) {
    return true;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && (adminKey === process.env.SUPABASE_SERVICE_ROLE_KEY || bearerToken === process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return true;
  }
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return true;
  } catch (e) {}

  return false;
}

export async function POST(request: Request) {
  const authorized = await verifyAdminAccess(request);
  if (!authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  try {
    const body = await request.json().catch(() => ({}));
    const { restaurant_id, tenant_id, purge_all_test } = body;

    // Purge all non-demo test restaurants
    if (purge_all_test) {
      console.log("[DeleteRestaurant] Purging all test restaurants (preserving demo tenant)...");
      const { data: testTenants } = await db
        .from("tenants")
        .select("id")
        .neq("id", "00000000-0000-0000-0000-000000000001");

      if (testTenants && testTenants.length > 0) {
        const tenantIds = testTenants.map((t) => t.id);

        // Fetch order IDs first for safe foreign key cleanup
        const { data: testOrders } = await db
          .from("restaurant_orders")
          .select("id")
          .in("tenant_id", tenantIds);

        if (testOrders && testOrders.length > 0) {
          const orderIds = testOrders.map((o) => o.id);
          await db.from("restaurant_order_items").delete().in("order_id", orderIds);
        }

        await db.from("restaurant_orders").delete().in("tenant_id", tenantIds);
        await db.from("restaurant_table_sessions").delete().in("tenant_id", tenantIds);
        await db.from("restaurant_tables").delete().in("tenant_id", tenantIds);
        await db.from("restaurant_staff").delete().in("tenant_id", tenantIds);
        await db.from("menu_categories").delete().in("tenant_id", tenantIds);
        await db.from("menu_items").delete().in("tenant_id", tenantIds);
        await db.from("restaurants").delete().in("tenant_id", tenantIds);
        await db.from("users_roles").delete().in("tenant_id", tenantIds);
        await db.from("profiles").delete().in("tenant_id", tenantIds);
        await db.from("tenants").delete().in("id", tenantIds);
      }

      return NextResponse.json({ success: true, message: "All test restaurants purged successfully." });
    }

    if (!restaurant_id && !tenant_id) {
      return NextResponse.json({ success: false, error: "restaurant_id or tenant_id required" }, { status: 400 });
    }

    // Single restaurant delete
    const tId = tenant_id || (await db.from("restaurants").select("tenant_id").eq("id", restaurant_id).maybeSingle()).data?.tenant_id;

    if (restaurant_id) {
      const { data: singleOrders } = await db
        .from("restaurant_orders")
        .select("id")
        .eq("restaurant_id", restaurant_id);

      if (singleOrders && singleOrders.length > 0) {
        const orderIds = singleOrders.map((o) => o.id);
        await db.from("restaurant_order_items").delete().in("order_id", orderIds);
      }

      await db.from("restaurant_orders").delete().eq("restaurant_id", restaurant_id);
      await db.from("restaurant_table_sessions").delete().eq("restaurant_id", restaurant_id);
      await db.from("restaurant_tables").delete().eq("restaurant_id", restaurant_id);
      await db.from("restaurant_staff").delete().eq("restaurant_id", restaurant_id);
      await db.from("menu_categories").delete().eq("restaurant_id", restaurant_id);
      await db.from("menu_items").delete().eq("restaurant_id", restaurant_id);
      await db.from("restaurants").delete().eq("id", restaurant_id);
    }

    if (tId && tId !== "00000000-0000-0000-0000-000000000001") {
      await db.from("users_roles").delete().eq("tenant_id", tId);
      await db.from("profiles").delete().eq("tenant_id", tId);
      await db.from("tenants").delete().eq("id", tId);
    }

    return NextResponse.json({ success: true, message: "Restaurant removed successfully." });
  } catch (err: any) {
    console.error("❌ Delete Restaurant Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
