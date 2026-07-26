import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function getRestaurantId(db: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await db
    .from("restaurants")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const restaurantId = await getRestaurantId(db);
    if (!restaurantId) return NextResponse.json({ sessions: [] });

    const { data: sessions, error } = await db
      .from("restaurant_table_sessions")
      .select("id, table_id, status, opened_at, customer_name, customer_phone, payment_status, paid_at")
      .eq("tenant_id", TENANT_ID)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .order("opened_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enriched = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: table } = await db
          .from("restaurant_tables")
          .select("id, table_number")
          .eq("id", session.table_id)
          .maybeSingle();

        const { data: orders } = await db
          .from("restaurant_orders")
          .select("id, status, total_amount, created_at")
          .eq("table_session_id", session.id)
          .eq("tenant_id", TENANT_ID)
          .order("created_at", { ascending: true });

        const enrichedOrders = await Promise.all(
          (orders || []).map(async (order) => {
            const { data: items } = await db
              .from("restaurant_order_items")
              .select("id, name, quantity, notes")
              .eq("order_id", order.id);
            return { ...order, items: items || [] };
          })
        );

        const orderCount = enrichedOrders.length;
        const sessionTotal = enrichedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const terminalStatuses = ["closed", "cancelled", "served"];
        const allOrdersTerminal =
          orderCount > 0 && enrichedOrders.every((o) => terminalStatuses.includes(o.status));

        return {
          ...session,
          table: table || null,
          orders: enrichedOrders,
          order_count: orderCount,
          session_total: sessionTotal,
          all_orders_terminal: allOrdersTerminal,
        };
      })
    );

    return NextResponse.json({ sessions: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
