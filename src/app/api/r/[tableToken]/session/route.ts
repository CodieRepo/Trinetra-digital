import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;

    if (!tableToken) {
      return NextResponse.json({ error: "tableToken is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("session_token");
    const tableSessionId = searchParams.get("table_session_id");

    if (!sessionToken) {
      return NextResponse.json({ error: "session_token is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Validate table
    const { data: table, error: tableErr } = await supabase
      .from("restaurant_tables")
      .select("id, is_active")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    // Search active session
    let sessionQuery = supabase
      .from("restaurant_table_sessions")
      .select("id, status, customer_name, customer_phone, payment_status, opened_at")
      .eq("table_id", table.id)
      .eq("session_token", sessionToken);

    if (tableSessionId) {
      sessionQuery = sessionQuery.eq("id", tableSessionId);
    }

    const { data: session } = await sessionQuery
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ session: null, orders: [] });
    }

    // Fetch orders & items
    const { data: orders } = await supabase
      .from("restaurant_orders")
      .select("*")
      .eq("table_session_id", session.id)
      .order("created_at", { ascending: true });

    const orderIds = (orders || []).map((o) => o.id);
    let orderItemsMap: Record<string, any[]> = {};

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("restaurant_order_items")
        .select("*")
        .in("order_id", orderIds);

      if (items) {
        for (const item of items) {
          if (!orderItemsMap[item.order_id]) {
            orderItemsMap[item.order_id] = [];
          }
          orderItemsMap[item.order_id].push(item);
        }
      }
    }

    const ordersWithItems = (orders || []).map((order) => ({
      ...order,
      items: orderItemsMap[order.id] || [],
    }));

    const sessionTotal = (orders || []).reduce(
      (sum, o) => (o.status !== "cancelled" ? sum + (Number(o.total_amount) || 0) : sum),
      0
    );

    // Fetch bill info if present
    const { data: bill } = await supabase
      .from("restaurant_bills")
      .select("subtotal, discount_type, discount_value, discount_amount, discount_reason, tax_amount, service_charge, round_off, grand_total, created_at")
      .eq("session_id", session.id)
      .maybeSingle();

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        customer_name: session.customer_name,
        customer_phone: session.customer_phone,
        payment_status: session.payment_status,
        opened_at: session.opened_at,
        session_total: sessionTotal,
      },
      orders: ordersWithItems,
      bill: bill || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
