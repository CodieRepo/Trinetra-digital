import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ orders: [] });

    const activeOnly = searchParams.get("active_only") === "true";

    let query = db
      .from("restaurant_orders")
      .select(`
        id, status, notes, total_amount, created_at, updated_at, table_id, table_session_id,
        table:restaurant_tables(id, table_number),
        items:restaurant_order_items(id, name, quantity, price, notes),
        session:restaurant_table_sessions(id, status, payment_status)
      `)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.not("status", "in", '("closed","cancelled")');
    }

    const { data: rawOrders, error } = await query.limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let orders = (rawOrders || []).map((o: any) => ({
      id: o.id,
      status: o.status,
      notes: o.notes,
      total_amount: Number(o.total_amount || 0),
      created_at: o.created_at,
      updated_at: o.updated_at,
      table_id: o.table_id,
      table_session_id: o.table_session_id,
      table: Array.isArray(o.table) ? o.table[0] || null : o.table || null,
      items: o.items || [],
      session_status: Array.isArray(o.session) ? o.session[0]?.status : o.session?.status || null,
      session_payment_status: Array.isArray(o.session) ? o.session[0]?.payment_status : o.session?.payment_status || null,
    }));

    if (activeOnly) {
      orders = orders.filter((o) => o.session_status !== "closed");
    }

    return NextResponse.json({ orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
