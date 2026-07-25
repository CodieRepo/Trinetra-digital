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

type OrderRecord = {
  id: string;
  table_id: string;
  table_session_id: string | null;
  status: string;
  notes: string | null;
  total_amount: number | string;
  created_at: string;
  updated_at: string;
};

type OrderItemRecord = {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
  notes: string | null;
};

type OrderEventRecord = {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_role: string | null;
  created_at: string;
};

type TableRecord = {
  id: string;
  table_number: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`order_poll:${ip}`, 30, 10);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfter).response;
    }

    const { order_id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("session_token")?.trim() || "";

    if (!orderId || !isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    if (!isUuid(sessionToken)) {
      return NextResponse.json(
        { error: "Invalid session_token" },
        { status: 400 },
      );
    }

    const getDatabaseClient() = getSupabaseAdmin();
    const { data: order, error: orderError } = await getDatabaseClient()
      .from("restaurant_orders")
      .select(
        "id, table_id, table_session_id, status, notes, total_amount, created_at, updated_at",
      )
      .eq("id", orderId)
      .eq("session_token", sessionToken)
      .maybeSingle<OrderRecord>();

    if (orderError) {
      throw new Error(orderError.message);
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const [
      { data: orderItems, error: orderItemsError },
      { data: events, error: eventsError },
      { data: table, error: tableError },
    ] = await Promise.all([
      getDatabaseClient()
        .from("restaurant_order_items")
        .select("id, name, price, quantity, notes")
        .eq("order_id", order.id)
        .order("id", { ascending: true })
        .returns<OrderItemRecord[]>(),
      getDatabaseClient()
        .from("restaurant_order_events")
        .select("id, from_status, to_status, actor_role, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true })
        .returns<OrderEventRecord[]>(),
      getDatabaseClient()
        .from("restaurant_tables")
        .select("id, table_number")
        .eq("id", order.table_id)
        .maybeSingle<TableRecord>(),
    ]);

    if (orderItemsError || eventsError || tableError) {
      throw new Error(
        orderItemsError?.message ||
          eventsError?.message ||
          tableError?.message ||
          "Failed to load order",
      );
    }

    return NextResponse.json({
      order: {
        ...order,
        total_amount: Number(order.total_amount),
        table: table ? { table_number: table.table_number } : null,
      },
      items:
        orderItems?.map((item) => ({
          ...item,
          price: Number(item.price),
        })) ?? [],
      events: events ?? [],
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
