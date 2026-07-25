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

type OrderItemInput = {
  menu_item_id: string;
  quantity: number;
  notes?: string | null;
};

type TableRecord = {
  id: string;
  restaurant_id: string;
  table_number: string;
  is_active: boolean;
};

type MenuItemRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number | string;
  is_available: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ table_token: string }> },
) {
  try {
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`restaurant_order:${ip}`, 20, 10);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfter).response;
    }

    const { table_token: tableToken } = await params;
    const body = await request.json();
    const sessionToken =
      typeof body?.session_token === "string" ? body.session_token.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null;
    const items = Array.isArray(body?.items)
      ? (body.items as OrderItemInput[])
      : [];

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

    if (!items.length) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    const normalizedItems = items.map((item) => ({
      menu_item_id: String(item.menu_item_id || "").trim(),
      quantity: Number(item.quantity),
      notes: typeof item.notes === "string" ? item.notes.trim() : null,
    }));

    if (
      normalizedItems.some(
        (item) =>
          !item.menu_item_id ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid order items" },
        { status: 400 },
      );
    }

    const getDatabaseClient() = getSupabaseAdmin();
    const { data: table, error: tableError } = await getDatabaseClient()
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number, is_active")
      .eq("table_token", tableToken)
      .maybeSingle<TableRecord>();

    if (tableError) {
      throw new Error(tableError.message);
    }

    if (!table || !table.is_active) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const menuItemIds = [
      ...new Set(normalizedItems.map((item) => item.menu_item_id)),
    ];
    const { data: menuItems, error: menuItemsError } = await getDatabaseClient()
      .from("menu_items")
      .select("id, restaurant_id, name, price, is_available")
      .eq("restaurant_id", table.restaurant_id)
      .eq("is_available", true)
      .in("id", menuItemIds)
      .returns<MenuItemRecord[]>();

    if (menuItemsError) {
      throw new Error(menuItemsError.message);
    }

    if (!menuItems || menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { error: "One or more menu items are unavailable" },
        { status: 400 },
      );
    }

    const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));
    const totalAmount = normalizedItems.reduce((sum, item) => {
      const menuItem = menuItemsById.get(item.menu_item_id);
      return sum + Number(menuItem?.price || 0) * item.quantity;
    }, 0);

    // ----- Find or create table session -----
    const clientTableSessionId =
      typeof body?.table_session_id === "string"
        ? body.table_session_id.trim()
        : "";

    let tableSessionId: string | null = null;

    // 1. If client provides a table_session_id, try to reuse it
    if (clientTableSessionId && isUuid(clientTableSessionId)) {
      const { data: existingSession } = await getDatabaseClient()
        .from("restaurant_table_sessions")
        .select("id, customer_name, customer_phone, payment_status")
        .eq("id", clientTableSessionId)
        .eq("table_id", table.id)
        .eq("session_token", sessionToken)
        .eq("status", "active")
        .maybeSingle<{
          id: string;
          customer_name: string | null;
          customer_phone: string | null;
          payment_status: string;
        }>();

      if (existingSession) {
        tableSessionId = existingSession.id;
        if (existingSession.payment_status === "paid") {
          return NextResponse.json(
            {
              error:
                "This table's bill has been settled. No new orders allowed.",
              session_paid: true,
            },
            { status: 400 },
          );
        }
        // Require identity before allowing order
        if (!existingSession.customer_name || !existingSession.customer_phone) {
          return NextResponse.json(
            { error: "Customer identity required", requires_identity: true },
            { status: 400 },
          );
        }
      }
    }

    // 2. If not reused, look for any active session for this token + table
    if (!tableSessionId) {
      const { data: activeSession } = await getDatabaseClient()
        .from("restaurant_table_sessions")
        .select("id, customer_name, customer_phone, payment_status")
        .eq("table_id", table.id)
        .eq("session_token", sessionToken)
        .eq("status", "active")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle<{
          id: string;
          customer_name: string | null;
          customer_phone: string | null;
          payment_status: string;
        }>();

      if (activeSession) {
        tableSessionId = activeSession.id;
        if (activeSession.payment_status === "paid") {
          return NextResponse.json(
            {
              error:
                "This table's bill has been settled. No new orders allowed.",
              session_paid: true,
            },
            { status: 400 },
          );
        }
        // Require identity before allowing order
        if (!activeSession.customer_name || !activeSession.customer_phone) {
          return NextResponse.json(
            { error: "Customer identity required", requires_identity: true },
            { status: 400 },
          );
        }
      }
    }

    // 3. If still none — no session exists, identity must be set first
    if (!tableSessionId) {
      return NextResponse.json(
        { error: "Customer identity required", requires_identity: true },
        { status: 400 },
      );
    }
    // ----- End table session logic -----

    const { data: order, error: orderError } = await getDatabaseClient()
      .from("restaurant_orders")
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        session_token: sessionToken,
        table_session_id: tableSessionId,
        status: "placed",
        notes,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .select("id, status, total_amount, table_session_id")
      .single<{
        id: string;
        status: string;
        total_amount: number | string;
        table_session_id: string | null;
      }>();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    const orderItems = normalizedItems.map((item) => {
      const menuItem = menuItemsById.get(item.menu_item_id)!;
      return {
        order_id: order.id,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: item.quantity,
        notes: item.notes,
      };
    });

    const [{ error: orderItemsError }, { error: orderEventError }] =
      await Promise.all([
        getDatabaseClient().from("restaurant_order_items").insert(orderItems),
        getDatabaseClient().from("restaurant_order_events").insert({
          order_id: order.id,
          from_status: null,
          to_status: "placed",
          actor_role: "client",
          actor_id: sessionToken,
        }),
      ]);

    if (orderItemsError || orderEventError) {
      throw new Error(
        orderItemsError?.message ||
          orderEventError?.message ||
          "Failed to finalize order",
      );
    }

    return NextResponse.json({
      order_id: order.id,
      status: order.status,
      total_amount: Number(order.total_amount),
      table_number: table.table_number,
      table_session_id: order.table_session_id ?? null,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
