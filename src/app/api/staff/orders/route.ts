import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  return "";
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
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

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const targetRestaurantId = restaurantId || staff.restaurant_id;

    // Filter statuses based on role
    const statuses = staff.role === "kitchen"
      ? ["placed", "accepted", "preparing", "ready"]
      : ["ready", "served"];

    // Query restaurant_orders
    const { data: orders, error: ordersErr } = await db
      .from("restaurant_orders")
      .select("id, table_id, table_session_id, status, notes, total_amount, created_at, updated_at")
      .eq("restaurant_id", targetRestaurantId)
      .in("status", statuses)
      .order("created_at", { ascending: true });

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        staff: { name: staff.name, role: staff.role },
        orders: [],
      });
    }

    const orderIds = orders.map((o) => o.id);
    const tableIds = Array.from(new Set(orders.map((o) => o.table_id).filter(Boolean))) as string[];

    // Fetch tables & order items in parallel
    const [tablesRes, itemsRes] = await Promise.all([
      tableIds.length > 0
        ? db.from("restaurant_tables").select("id, table_number").in("id", tableIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length > 0
        ? db.from("restaurant_order_items").select("id, order_id, name, quantity, price, notes").in("order_id", orderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (tablesRes.error) {
      return NextResponse.json({ error: tablesRes.error.message }, { status: 500 });
    }
    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }

    const tablesMap = new Map((tablesRes.data || []).map((t) => [t.id, t]));
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

    const hydratedOrders = orders.map((o) => {
      const table = o.table_id ? tablesMap.get(o.table_id) : null;
      return {
        id: o.id,
        table_id: o.table_id,
        table_session_id: o.table_session_id,
        status: o.status,
        notes: o.notes,
        total_amount: Number(o.total_amount),
        created_at: o.created_at,
        updated_at: o.updated_at,
        table: table ? { id: table.id, table_number: table.table_number } : null,
        items: itemsMap.get(o.id) || [],
      };
    });

    return NextResponse.json({
      staff: { name: staff.name, role: staff.role },
      orders: hydratedOrders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
