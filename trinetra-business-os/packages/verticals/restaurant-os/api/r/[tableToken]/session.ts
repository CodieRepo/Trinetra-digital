import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/rateLimit";
import { isUuid } from "../types";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";

export const dynamic = "force-dynamic";

type SessionRecord = {
  id: string;
  table_id: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: string;
};

type SessionOrderRecord = {
  id: string;
  status: string;
  notes: string | null;
  total_amount: number | string;
  created_at: string;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  name: string;
  price: number | string;
  quantity: number;
  notes: string | null;
};

type TableRecord = {
  id: string;
  table_number: string;
};

/**
 * GET /api/r/{table_token}/session?session_token=...&table_session_id=...
 *
 * Returns the current table session summary: session info, all orders, their items,
 * and the collective session total.
 *
 * If table_session_id is provided and valid, uses that session.
 * Otherwise falls back to finding the most recent active session for this token+table.
 * If no session is found, returns { session: null }.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ table_token: string }> },
) {
  try {
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`session_get:${ip}`, 30, 10);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfter).response;
    }

    const { table_token: tableToken } = await params;
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("session_token")?.trim() || "";
    const tableSessionId = searchParams.get("table_session_id")?.trim() || "";

    if (!tableToken) {
      return NextResponse.json(
        { error: "Missing table token" },
        { status: 400 },
      );
    }

    if (!isUuid(sessionToken)) {
      return NextResponse.json(
        { error: "Invalid session_token" },
        { status: 400 },
      );
    }

    const db = getDatabaseClient();

    // Resolve the table
    const { data: table, error: tableError } = await db
      .from("restaurant_tables")
      .select("id, table_number")
      .eq("table_token", tableToken)
      .maybeSingle<TableRecord>();

    if (tableError) {
      throw new Error(tableError.message);
    }

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // --- Resolve session ---
    let session: SessionRecord | null = null;

    // 1. If client provides a table_session_id, validate and use it
    if (tableSessionId && isUuid(tableSessionId)) {
      const { data: providedSession } = await db
        .from("restaurant_table_sessions")
        .select(
          "id, table_id, status, opened_at, closed_at, customer_name, customer_phone, payment_status",
        )
        .eq("id", tableSessionId)
        .eq("table_id", table.id)
        .eq("session_token", sessionToken)
        .maybeSingle<SessionRecord>();

      if (providedSession) {
        session = providedSession;
      }
    }

    // 2. Fall back to most recent active session for this token + table
    if (!session) {
      const { data: activeSession } = await db
        .from("restaurant_table_sessions")
        .select(
          "id, table_id, status, opened_at, closed_at, customer_name, customer_phone, payment_status",
        )
        .eq("table_id", table.id)
        .eq("session_token", sessionToken)
        .eq("status", "active")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle<SessionRecord>();

      if (activeSession) {
        session = activeSession;
      }
    }

    // No session found
    if (!session) {
      return NextResponse.json({
        session: null,
        orders: [],
        session_total: 0,
        table: { id: table.id, table_number: table.table_number },
      });
    }

    // --- Fetch all orders in this session ---
    const { data: orders, error: ordersError } = await db
      .from("restaurant_orders")
      .select("id, status, notes, total_amount, created_at")
      .eq("table_session_id", session.id)
      .order("created_at", { ascending: true })
      .returns<SessionOrderRecord[]>();

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    const orderIds = (orders ?? []).map((o) => o.id);

    // Fetch items for all orders in one batch
    const { data: allItems, error: itemsError } = orderIds.length
      ? await db
          .from("restaurant_order_items")
          .select("id, order_id, name, price, quantity, notes")
          .in("order_id", orderIds)
          .returns<OrderItemRecord[]>()
      : { data: [] as OrderItemRecord[], error: null };

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const itemsByOrder = new Map<string, OrderItemRecord[]>();
    for (const item of allItems ?? []) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    const sessionTotal = (orders ?? []).reduce(
      (sum, o) => sum + Number(o.total_amount),
      0,
    );

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        opened_at: session.opened_at,
        closed_at: session.closed_at,
        customer_name: session.customer_name,
        payment_status: session.payment_status,
      },
      orders: (orders ?? []).map((o) => ({
        id: o.id,
        status: o.status,
        notes: o.notes,
        total_amount: Number(o.total_amount),
        created_at: o.created_at,
        items: (itemsByOrder.get(o.id) ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          notes: item.notes,
        })),
      })),
      session_total: sessionTotal,
      table: { id: table.id, table_number: table.table_number },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
