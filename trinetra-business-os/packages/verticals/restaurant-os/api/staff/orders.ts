import { NextResponse } from "next/server";
import { isUuid, type RestaurantStaffRole } from "../types";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";
import { verifyStaffToken, extractBearerToken } from "../../services/auth";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: Record<RestaurantStaffRole, string[]> = {
  kitchen: ["placed", "accepted", "preparing", "ready"],
  waiter: ["ready", "served"],
};

type StaffRecord = {
  id: string;
  name: string;
  role: RestaurantStaffRole;
};

type OrderRecord = {
  id: string;
  table_id: string;
  status: string;
  notes: string | null;
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
    const [
      { data: staff, error: staffError },
      { data: orders, error: ordersError },
    ] = await Promise.all([
      db
        .from("restaurant_staff")
        .select("id, name, role")
        .eq("id", verifiedStaff.staff_id)
        .maybeSingle<StaffRecord>(),
      db
        .from("restaurant_orders")
        .select("id, table_id, status, notes, total_amount, created_at")
        .eq("restaurant_id", restaurantId)
        .in("status", ACTIVE_STATUSES[verifiedStaff.role])
        .order("created_at", { ascending: true })
        .returns<OrderRecord[]>(),
    ]);

    if (staffError || ordersError) {
      throw new Error(
        staffError?.message ||
          ordersError?.message ||
          "Failed to load staff orders",
      );
    }

    const orderIds = orders?.map((order) => order.id) ?? [];
    const tableIds = [
      ...new Set((orders ?? []).map((order) => order.table_id)),
    ];

    const [
      { data: orderItems, error: orderItemsError },
      { data: tables, error: tablesError },
    ] = await Promise.all([
      orderIds.length
        ? db
            .from("restaurant_order_items")
            .select("id, order_id, name, quantity, notes")
            .in("order_id", orderIds)
            .returns<OrderItemRecord[]>()
        : Promise.resolve({ data: [], error: null }),
      tableIds.length
        ? db
            .from("restaurant_tables")
            .select("id, table_number")
            .in("id", tableIds)
            .returns<TableRecord[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (orderItemsError || tablesError) {
      throw new Error(
        orderItemsError?.message ||
          tablesError?.message ||
          "Failed to hydrate staff orders",
      );
    }

    const itemsByOrderId = new Map<string, OrderItemRecord[]>();
    for (const item of orderItems ?? []) {
      itemsByOrderId.set(item.order_id, [
        ...(itemsByOrderId.get(item.order_id) ?? []),
        item,
      ]);
    }

    const tablesById = new Map(
      (tables ?? []).map((table) => [table.id, table]),
    );

    return NextResponse.json({
      staff: staff
        ? {
            name: staff.name,
            role: staff.role,
          }
        : {
            name: verifiedStaff.name,
            role: verifiedStaff.role,
          },
      orders:
        orders?.map((order) => ({
          ...order,
          total_amount: Number(order.total_amount),
          table: tablesById.has(order.table_id)
            ? {
                id: order.table_id,
                table_number: tablesById.get(order.table_id)!.table_number,
              }
            : null,
          items: itemsByOrderId.get(order.id) ?? [],
        })) ?? [],
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
