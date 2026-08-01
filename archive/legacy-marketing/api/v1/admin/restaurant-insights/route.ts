import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSupabaseAdmin();
  try {
    // Fetch all restaurants and join with tenants
    const { data: restaurants, error: restErr } = await db
      .from("restaurants")
      .select(`
        id,
        name,
        address,
        currency,
        is_active,
        tenant_id,
        tenants (
          name,
          plan,
          status,
          created_at
        )
      `);

    if (restErr) throw restErr;

    const insights = [];

    for (const r of (restaurants as any) || []) {
      // 1. Get total tables count
      const { count: tableCount } = await db
        .from("restaurant_tables")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", r.id);

      // 2. Get active sessions count
      const { count: activeSessions } = await db
        .from("restaurant_table_sessions")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", r.id)
        .eq("status", "active");

      // 3. Get total orders and revenue
      const { data: orders } = await db
        .from("restaurant_orders")
        .select("total_amount, status")
        .eq("restaurant_id", r.id);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders
        ?.filter((o: any) => o.status !== "cancelled")
        .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0) || 0;

      insights.push({
        id: r.id,
        tenantId: r.tenant_id,
        businessName: r.name,
        address: r.address,
        currency: r.currency,
        isActive: r.is_active,
        tenantName: r.tenants?.name || "Unknown Tenant",
        plan: r.tenants?.plan || "pro",
        status: r.tenants?.status || "active",
        createdAt: r.tenants?.created_at || new Date().toISOString(),
        tableCount: tableCount || 0,
        activeSessions: activeSessions || 0,
        totalOrders,
        totalRevenue,
      });
    }

    return NextResponse.json({ success: true, insights });
  } catch (err: any) {
    console.error("❌ Super Admin Restaurant Insights Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
