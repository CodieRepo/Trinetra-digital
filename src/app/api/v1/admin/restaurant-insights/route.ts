import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient as createServerClient } from "@/lib/supabase/server";

async function verifyAdminAccess(request: Request): Promise<boolean> {
  const adminKey = request.headers.get("x-admin-key") || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (process.env.ADMIN_ONBOARDING_KEY) {
    if (adminKey === process.env.ADMIN_ONBOARDING_KEY || bearerToken === process.env.ADMIN_ONBOARDING_KEY) {
      return true;
    }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (adminKey === process.env.SUPABASE_SERVICE_ROLE_KEY || bearerToken === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return true;
    }
  }

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return true;
  } catch (e) {
    // Session check error ignored
  }

  return false;
}

export async function GET(request: Request) {
  const authorized = await verifyAdminAccess(request);
  if (!authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

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

    // Batch fetch metrics in parallel across all restaurants
    const [tablesRes, sessionsRes, ordersRes] = await Promise.all([
      db.from("restaurant_tables").select("restaurant_id"),
      db.from("restaurant_table_sessions").select("restaurant_id").eq("status", "active"),
      db.from("restaurant_orders").select("restaurant_id, total_amount, status")
    ]);

    // Build lookup maps in O(N)
    const tableCounts: Record<string, number> = {};
    for (const t of (tablesRes.data || [])) {
      if (t.restaurant_id) {
        tableCounts[t.restaurant_id] = (tableCounts[t.restaurant_id] || 0) + 1;
      }
    }

    const activeSessionCounts: Record<string, number> = {};
    for (const s of (sessionsRes.data || [])) {
      if (s.restaurant_id) {
        activeSessionCounts[s.restaurant_id] = (activeSessionCounts[s.restaurant_id] || 0) + 1;
      }
    }

    const orderCounts: Record<string, number> = {};
    const revenueTotals: Record<string, number> = {};
    for (const o of (ordersRes.data || [])) {
      if (o.restaurant_id) {
        orderCounts[o.restaurant_id] = (orderCounts[o.restaurant_id] || 0) + 1;
        if (o.status !== "cancelled") {
          revenueTotals[o.restaurant_id] = (revenueTotals[o.restaurant_id] || 0) + (Number(o.total_amount) || 0);
        }
      }
    }

    const insights = (restaurants as any[] || []).map((r) => ({
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
      tableCount: tableCounts[r.id] || 0,
      activeSessions: activeSessionCounts[r.id] || 0,
      totalOrders: orderCounts[r.id] || 0,
      totalRevenue: revenueTotals[r.id] || 0,
    }));

    return NextResponse.json({ success: true, insights });
  } catch (err: any) {
    console.error("❌ Super Admin Restaurant Insights Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
