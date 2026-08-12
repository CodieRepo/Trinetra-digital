import { NextResponse } from "next/server";
import {
  getApiErrorStatus,
  getErrorMessage,
  requireRestaurantClientContext,
} from "../../services/server";
import { isTerminalOrderStatus } from "../types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionRecord = {
  id: string;
  table_id: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: string;
  paid_at: string | null;
};

type SessionOrderRecord = {
  id: string;
  table_session_id: string;
  status: string;
  total_amount: number | string;
  created_at: string;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  notes: string | null;
};

type TableRecord = {
  id: string;
  table_number: string;
};

// ---------------------------------------------------------------------------
// GET /api/client/restaurant/sessions
//
// Returns all active table sessions with orders, items, and totals.
// Authenticated via Supabase client auth (restaurant owner).
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const context = await requireRestaurantClientContext();
    const restaurantId = context.restaurant.id;
    const db = getDatabaseClient();

    // 1. Active sessions
    const { data: sessions, error: sessionsError } = await db
      .from("restaurant_table_sessions")
      .select(
        "id, table_id, status, opened_at, closed_at, customer_name, customer_phone, payment_status, paid_at",
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .order("opened_at", { ascending: true })
      .returns<SessionRecord[]>();

    if (sessionsError) throw new Error(sessionsError.message);
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sessionIds = sessions.map((s) => s.id);
    const tableIds = [...new Set(sessions.map((s) => s.table_id))];

    // 2. Orders + tables in parallel
    const [
      { data: orders, error: ordersError },
      { data: tables, error: tablesError },
    ] = await Promise.all([
      db
        .from("restaurant_orders")
        .select("id, table_session_id, status, total_amount, created_at")
        .in("table_session_id", sessionIds)
        .order("created_at", { ascending: true })
        .returns<SessionOrderRecord[]>(),
      db
        .from("restaurant_tables")
        .select("id, table_number")
        .in("id", tableIds)
        .returns<TableRecord[]>(),
    ]);

    if (ordersError) throw new Error(ordersError.message);
    if (tablesError) throw new Error(tablesError.message);

    // 3. Items for all orders in one batch
    const orderIds = (orders ?? []).map((o) => o.id);
    const { data: allItems, error: itemsError } = orderIds.length
      ? await db
          .from("restaurant_order_items")
          .select("id, order_id, name, quantity, notes")
          .in("order_id", orderIds)
          .returns<OrderItemRecord[]>()
      : { data: [] as OrderItemRecord[], error: null };

    if (itemsError) throw new Error(itemsError.message);

    // 4. Build lookup maps
    const tablesById = new Map((tables ?? []).map((t) => [t.id, t]));
    const itemsByOrder = new Map<string, OrderItemRecord[]>();
    for (const item of allItems ?? []) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }
    const ordersBySession = new Map<string, SessionOrderRecord[]>();
    for (const order of orders ?? []) {
      const list = ordersBySession.get(order.table_session_id) ?? [];
      list.push(order);
      ordersBySession.set(order.table_session_id, list);
    }

    // 5. Assemble response
    const result = sessions.map((session) => {
      const sessionOrders = ordersBySession.get(session.id) ?? [];
      const sessionTotal = sessionOrders.reduce(
        (sum, o) => sum + Number(o.total_amount),
        0,
      );
      const allTerminal =
        sessionOrders.length > 0 &&
        sessionOrders.every((o) => isTerminalOrderStatus(o.status));
      const table = tablesById.get(session.table_id);

      return {
        id: session.id,
        table: table
          ? { id: table.id, table_number: table.table_number }
          : null,
        status: session.status,
        opened_at: session.opened_at,
        customer_name: session.customer_name,
        customer_phone: session.customer_phone,
        payment_status: session.payment_status,
        paid_at: session.paid_at,
        order_count: sessionOrders.length,
        session_total: sessionTotal,
        all_orders_terminal: allTerminal,
        orders: sessionOrders.map((o) => ({
          id: o.id,
          status: o.status,
          total_amount: Number(o.total_amount),
          created_at: o.created_at,
          items: (itemsByOrder.get(o.id) ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            notes: item.notes,
          })),
        })),
      };
    });

    return NextResponse.json({ sessions: result });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: getApiErrorStatus(message) },
    );
  }
}
