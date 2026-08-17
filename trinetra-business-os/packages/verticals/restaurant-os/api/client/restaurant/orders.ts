import { NextResponse } from "next/server";
import { getApiErrorStatus, getErrorMessage, getDatabaseClient, requireRestaurantClientContext } from "../../services/server";

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
  order_id: string;
  name: string;
  quantity: number;
  price: number | string;
  notes: string | null;
};

type TableRecord = {
  id: string;
  table_number: string;
};

export async function GET(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const scope = searchParams.get("scope")?.trim();
    const activeOnly = searchParams.get("active_only") === "true" || scope === "active";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));

    let activeSessionIds: string[] | null = null;

    if (activeOnly) {
      const { data: activeSessions, error: sessionsError } = await getDatabaseClient()
        .from("restaurant_table_sessions")
        .select("id")
        .eq("restaurant_id", context.restaurant.id)
        .eq("status", "active");

      if (sessionsError) {
        throw new Error(sessionsError.message);
      }

      activeSessionIds = (activeSessions ?? []).map((s) => s.id);
      if (activeSessionIds.length === 0) {
        return NextResponse.json({ orders: [] });
      }
    }

    let query = getDatabaseClient()
      .from("restaurant_orders")
      .select("id, table_id, table_session_id, status, notes, total_amount, created_at, updated_at")
      .eq("restaurant_id", context.restaurant.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (activeOnly && activeSessionIds) {
      query = query
        .in("table_session_id", activeSessionIds)
        .not("status", "eq", "closed")
        .not("status", "eq", "cancelled");
    } else if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error: ordersError } = await query.returns<OrderRecord[]>();
    if (ordersError) {
      throw new Error(ordersError.message);
    }

    const orderIds = orders?.map((order) => order.id) ?? [];
    const tableIds = [...new Set((orders ?? []).map((order) => order.table_id))];

    const [{ data: orderItems, error: orderItemsError }, { data: tables, error: tablesError }] = await Promise.all([
      orderIds.length
        ? getDatabaseClient()
            .from("restaurant_order_items")
            .select("id, order_id, name, quantity, price, notes")
            .in("order_id", orderIds)
            .returns<OrderItemRecord[]>()
        : Promise.resolve({ data: [], error: null }),
      tableIds.length
        ? getDatabaseClient()
            .from("restaurant_tables")
            .select("id, table_number")
            .in("id", tableIds)
            .returns<TableRecord[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (orderItemsError || tablesError) {
      throw new Error(orderItemsError?.message || tablesError?.message || "Failed to load restaurant orders");
    }

    const itemsByOrderId = new Map<string, OrderItemRecord[]>();
    for (const item of orderItems ?? []) {
      itemsByOrderId.set(item.order_id, [...(itemsByOrderId.get(item.order_id) ?? []), item]);
    }

    const tableMap = new Map<string, TableRecord>((tables ?? []).map((table) => [table.id, table]));

    return NextResponse.json({
      orders:
        orders?.map((order) => ({
          ...order,
          table_session_id: order.table_session_id ?? null,
          total_amount: Number(order.total_amount),
          table: tableMap.has(order.table_id)
            ? {
                id: order.table_id,
                table_number: tableMap.get(order.table_id)!.table_number,
              }
            : null,
          items:
            itemsByOrderId.get(order.id)?.map((item) => ({
              ...item,
              price: Number(item.price),
            })) ?? [],
        })) ?? [],
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

