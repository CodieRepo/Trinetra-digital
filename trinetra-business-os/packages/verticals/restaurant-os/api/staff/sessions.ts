import { NextResponse } from "next/server";
import {
  isUuid,
  isTerminalOrderStatus,
  type RestaurantOrderStatus,
} from "../types";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";
import { verifyStaffToken, extractBearerToken } from "../../services/auth";

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
// GET /api/staff/sessions?restaurant_id=...&access_token=...
//
// Returns all active table sessions with their orders, items, and totals.
// Designed for staff session visibility (waiter table-turnover view).
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id")?.trim() || "";
    const accessToken = extractBearerToken(request);

    if (!isUuid(restaurantId)) {
      return NextResponse.json(
        { error: "Invalid restaurant_id" },
        { status: 400 },
      );
    }

    const verifiedStaff = await verifyStaffToken(accessToken);
    if (!verifiedStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (verifiedStaff.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDatabaseClient();

    // 1. Active sessions for this restaurant
    const { data: sessions, error: sessionsError } = await db
      .from("restaurant_table_sessions")
      .select(
        "id, table_id, status, opened_at, closed_at, customer_name, customer_phone",
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/staff/sessions
//
// Close a table session. Body:
// {
//   access_token: string,
//   session_id: string,
//   force?: boolean          // required when active orders still exist
// }
//
// Safe close: all orders terminal → mark session closed.
// Force close: active orders exist + force=true → cancel active orders,
//   then close session. Audit trail preserved via order_events.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request);
    const body = await request.json();
    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";
    const force = body?.force === true;

    if (!isUuid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session_id" },
        { status: 400 },
      );
    }

    const verifiedStaff = await verifyStaffToken(accessToken);
    if (!verifiedStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabaseClient();

    // 1. Load session
    const { data: session, error: sessionError } = await db
      .from("restaurant_table_sessions")
      .select("id, restaurant_id, status")
      .eq("id", sessionId)
      .maybeSingle<{ id: string; restaurant_id: string; status: string }>();

    if (sessionError) throw new Error(sessionError.message);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.restaurant_id !== verifiedStaff.restaurant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.status === "closed") {
      return NextResponse.json(
        { error: "Session is already closed" },
        { status: 400 },
      );
    }

    // 2. Check orders in this session
    const { data: orders, error: ordersError } = await db
      .from("restaurant_orders")
      .select("id, status")
      .eq("table_session_id", sessionId)
      .returns<{ id: string; status: string }[]>();

    if (ordersError) throw new Error(ordersError.message);

    const activeOrders = (orders ?? []).filter(
      (o) => !isTerminalOrderStatus(o.status),
    );

    // 3. Validate close rules
    if (activeOrders.length > 0 && !force) {
      return NextResponse.json(
        {
          error: "Session has active orders. Use force close to cancel them.",
          active_order_count: activeOrders.length,
          requires_force: true,
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    // 4. Force-close: cancel active orders with audit trail
    if (activeOrders.length > 0) {
      const cancelOps = activeOrders.map((o) =>
        Promise.all([
          db
            .from("restaurant_orders")
            .update({
              status: "cancelled" as RestaurantOrderStatus,
              updated_at: now,
            })
            .eq("id", o.id),
          db.from("restaurant_order_events").insert({
            order_id: o.id,
            from_status: o.status,
            to_status: "cancelled",
            actor_role: verifiedStaff.role,
            actor_id: verifiedStaff.staff_id,
          }),
        ]),
      );
      await Promise.all(cancelOps);
    }

    // 5. Close the session
    const { error: closeError } = await db
      .from("restaurant_table_sessions")
      .update({ status: "closed", closed_at: now })
      .eq("id", sessionId);

    if (closeError) throw new Error(closeError.message);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      forced: activeOrders.length > 0,
      cancelled_orders: activeOrders.length,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
