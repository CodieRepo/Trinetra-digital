import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStaffToken(request: Request): string {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  const xToken = request.headers.get("x-staff-token");
  if (xToken && xToken.trim()) return xToken.trim();
  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get("token");
    if (qToken && qToken.trim()) return qToken.trim();
  } catch (e) {}
  return "";
}

export async function GET(request: Request) {
  try {
    const token = getStaffToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing Bearer token" }, { status: 401 });
    }

    const db = getSupabaseAdmin();
    const { data: staff, error: staffErr } = await db
      .from("restaurant_staff")
      .select("id, tenant_id, restaurant_id, name, role, is_active")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (staffErr || !staff) {
      return NextResponse.json({ error: "Unauthorized: Invalid or inactive staff token" }, { status: 401 });
    }

    const restaurantId = staff.restaurant_id;

    // Fetch active sessions
    const { data: sessions, error: sessionsErr } = await db
      .from("restaurant_table_sessions")
      .select("id, tenant_id, restaurant_id, table_id, lead_id, session_token, customer_name, customer_phone, status, payment_status, paid_at, opened_at, closed_at, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .order("opened_at", { ascending: true });

    if (sessionsErr) {
      return NextResponse.json({ error: sessionsErr.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sessionIds = sessions.map((s) => s.id);
    const tableIds = Array.from(new Set(sessions.map((s) => s.table_id).filter(Boolean))) as string[];

    // Fetch tables & orders in parallel
    const [tablesRes, ordersRes] = await Promise.all([
      tableIds.length > 0
        ? db.from("restaurant_tables").select("id, table_number").in("id", tableIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length > 0
        ? db.from("restaurant_orders").select("id, table_session_id, status, notes, total_amount, created_at").in("table_session_id", sessionIds).order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (tablesRes.error) {
      return NextResponse.json({ error: tablesRes.error.message }, { status: 500 });
    }
    if (ordersRes.error) {
      return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    }

    const tablesMap = new Map((tablesRes.data || []).map((t) => [t.id, t]));
    const ordersData = ordersRes.data || [];
    const orderIds = ordersData.map((o) => o.id);

    // Fetch order items for all session orders
    const itemsRes = orderIds.length > 0
      ? await db.from("restaurant_order_items").select("id, order_id, name, quantity, price, notes").in("order_id", orderIds)
      : { data: [], error: null };

    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }

    const itemsMap = new Map<string, Array<{ id: string; name: string; quantity: number; price: number; notes: string | null }>>();
    for (const item of itemsRes.data || []) {
      const existing = itemsMap.get(item.order_id) || [];
      existing.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        notes: item.notes,
      });
      itemsMap.set(item.order_id, existing);
    }

    // Group orders by table_session_id
    const sessionOrdersMap = new Map<string, Array<{ id: string; status: string; notes: string | null; total_amount: number; created_at: string; items: Array<any> }>>();
    for (const order of ordersData) {
      const existing = sessionOrdersMap.get(order.table_session_id) || [];
      existing.push({
        id: order.id,
        status: order.status,
        notes: order.notes,
        total_amount: Number(order.total_amount),
        created_at: order.created_at,
        items: itemsMap.get(order.id) || [],
      });
      sessionOrdersMap.set(order.table_session_id, existing);
    }

    const hydratedSessions = sessions.map((s) => {
      const table = s.table_id ? tablesMap.get(s.table_id) : null;
      const sOrders = sessionOrdersMap.get(s.id) || [];
      const sessionTotal = sOrders.reduce((sum, o) => o.status !== "cancelled" ? sum + o.total_amount : sum, 0);
      const allOrdersTerminal = sOrders.length > 0 && sOrders.every((o) => ["served", "closed", "cancelled"].includes(o.status));

      return {
        id: s.id,
        table_id: s.table_id,
        table: table ? { id: table.id, table_number: table.table_number } : null,
        status: s.status,
        opened_at: s.opened_at,
        closed_at: s.closed_at,
        customer_name: s.customer_name || null,
        customer_phone: s.customer_phone || null,
        payment_status: s.payment_status,
        paid_at: s.paid_at || null,
        order_count: sOrders.length,
        session_total: sessionTotal,
        all_orders_terminal: allOrdersTerminal,
        orders: sOrders,
      };
    });

    return NextResponse.json({ sessions: hydratedSessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
