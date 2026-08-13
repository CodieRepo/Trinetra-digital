import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ sessions: [] });

    const { data: rawSessions, error } = await db
      .from("restaurant_table_sessions")
      .select(`
        id, table_id, status, opened_at, customer_name, customer_phone, payment_status, paid_at, bill_requested_at,
        table:restaurant_tables(id, table_number),
        orders:restaurant_orders(
          id, status, total_amount, created_at,
          items:restaurant_order_items(id, name, quantity, notes)
        ),
        bill:restaurant_bills(*)
      `)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .order("opened_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enriched = (rawSessions || []).map((session: any) => {
      const tableObj = Array.isArray(session.table) ? session.table[0] || null : session.table || null;
      const rawOrders = session.orders || [];
      const sortedOrders = [...rawOrders].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const enrichedOrders = sortedOrders.map((o: any) => ({
        id: o.id,
        status: o.status,
        total_amount: Number(o.total_amount || 0),
        created_at: o.created_at,
        items: o.items || []
      }));

      const billObj = Array.isArray(session.bill) ? session.bill[0] || null : session.bill || null;
      const orderCount = enrichedOrders.length;
      const sessionTotal = enrichedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const terminalStatuses = ["closed", "cancelled", "served"];
      const allOrdersTerminal = orderCount > 0 && enrichedOrders.every((o) => terminalStatuses.includes(o.status));

      return {
        id: session.id,
        table_id: session.table_id,
        status: session.status,
        opened_at: session.opened_at,
        customer_name: session.customer_name,
        customer_phone: session.customer_phone,
        payment_status: session.payment_status,
        paid_at: session.paid_at,
        bill_requested_at: session.bill_requested_at || null,
        table: tableObj,
        orders: enrichedOrders,
        order_count: orderCount,
        session_total: sessionTotal,
        all_orders_terminal: allOrdersTerminal,
        bill: billObj
      };
    });

    return NextResponse.json({ sessions: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
