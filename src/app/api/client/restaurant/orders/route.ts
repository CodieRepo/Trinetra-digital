import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext, RestaurantContextError } from "../context";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ orders: [] });

    const { data: orders, error } = await db
      .from("restaurant_orders")
      .select("id, status, notes, total_amount, created_at, updated_at, table_id, table_session_id, order_source, created_by_staff_id")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const tableIds = Array.from(new Set(orders.map((o) => o.table_id).filter(Boolean))) as string[];
    const staffIds = Array.from(new Set(orders.map((o) => o.created_by_staff_id).filter(Boolean))) as string[];
    const orderIds = orders.map((o) => o.id);

    const [tablesRes, staffRes, itemsRes] = await Promise.all([
      tableIds.length > 0
        ? db
            .from("restaurant_tables")
            .select("id, table_number, floor_id, restaurant_floors ( id, name )")
            .eq("tenant_id", tenantId)
            .in("id", tableIds)
        : Promise.resolve({ data: [], error: null }),
      staffIds.length > 0
        ? db
            .from("restaurant_staff")
            .select("id, name, role")
            .eq("tenant_id", tenantId)
            .in("id", staffIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length > 0
        ? db
            .from("restaurant_order_items")
            .select("id, order_id, name, quantity, price, notes")
            .eq("tenant_id", tenantId)
            .in("order_id", orderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const tablesMap = new Map((tablesRes.data || []).map((t: any) => [t.id, t]));
    const staffMap = new Map((staffRes.data || []).map((s: any) => [s.id, s]));
    const itemsMap = new Map<string, Array<any>>();
    for (const item of itemsRes.data || []) {
      const existing = itemsMap.get(item.order_id) || [];
      existing.push(item);
      itemsMap.set(item.order_id, existing);
    }

    const enriched = orders.map((order: any) => {
      const table = order.table_id ? tablesMap.get(order.table_id) : null;
      const staff = order.created_by_staff_id ? staffMap.get(order.created_by_staff_id) : null;

      return {
        ...order,
        order_source: order.order_source || null,
        created_by_staff_id: order.created_by_staff_id || null,
        staff_name: staff?.name || null,
        table: table
          ? {
              id: table.id,
              table_number: table.table_number,
              floor_id: table.floor_id || null,
              floor_name: table.restaurant_floors?.name || null,
            }
          : null,
        items: itemsMap.get(order.id) || [],
      };
    });

    return NextResponse.json({ orders: enriched });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);

    if (!restaurantId || !tenantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 400 });
    }

    const { table_id, table_session_id, notes, items, staff_id } = body;

    if (!table_id) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array cannot be empty" }, { status: 400 });
    }

    // Validate table
    const { data: table, error: tableErr } = await db
      .from("restaurant_tables")
      .select("id, tenant_id, restaurant_id, table_number, floor_id, is_active, restaurant_floors ( id, name )")
      .eq("id", table_id)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    // Validate staff if provided
    let verifiedStaffId: string | null = null;
    let verifiedStaffName: string | null = null;
    if (staff_id) {
      const { data: staff } = await db
        .from("restaurant_staff")
        .select("id, name, is_active")
        .eq("id", staff_id)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .maybeSingle();

      if (staff) {
        verifiedStaffId = staff.id;
        verifiedStaffName = staff.name;
      }
    }

    // Locate active session or create new
    let activeSession: any = null;
    if (table_session_id) {
      const { data: s } = await db
        .from("restaurant_table_sessions")
        .select("id, session_token, payment_status, status")
        .eq("id", table_session_id)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .eq("table_id", table.id)
        .maybeSingle();
      if (s && s.status !== "closed") {
        activeSession = s;
      }
    }

    if (!activeSession) {
      const { data: s } = await db
        .from("restaurant_table_sessions")
        .select("id, session_token, payment_status, status")
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .eq("table_id", table.id)
        .eq("status", "active")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (s) {
        activeSession = s;
      } else {
        const sessionToken = crypto.randomUUID();
        const { data: newSession, error: createSessionErr } = await db
          .from("restaurant_table_sessions")
          .insert({
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            table_id: table.id,
            session_token: sessionToken,
            status: "active",
            payment_status: "unpaid",
          })
          .select("id, session_token, payment_status, status")
          .single();

        if (createSessionErr || !newSession) {
          return NextResponse.json({ error: "Failed to create table session" }, { status: 400 });
        }
        activeSession = newSession;
      }
    }

    // Calculate total amount
    const menuItemIds = items.map((i: any) => i.menu_item_id || i.item_id);
    const { data: dbMenuItems, error: menuErr } = await db
      .from("menu_items")
      .select("id, name, price, is_available")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .in("id", menuItemIds);

    if (menuErr || !dbMenuItems) {
      return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 400 });
    }

    const menuItemMap = new Map(dbMenuItems.map((item) => [item.id, item]));
    let totalAmount = 0;
    const orderItemsToInsert: any[] = [];

    for (const item of items) {
      const targetItemId = item.menu_item_id || item.item_id;
      const dbItem = menuItemMap.get(targetItemId);
      if (!dbItem) {
        return NextResponse.json({ error: `Menu item ${targetItemId} not found` }, { status: 400 });
      }
      const qty = Math.floor(Number(item.quantity));
      if (!qty || qty <= 0) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
      const price = Number(dbItem.price) || 0;
      totalAmount += price * qty;

      orderItemsToInsert.push({
        tenant_id: tenantId,
        menu_item_id: dbItem.id,
        name: dbItem.name,
        price: price,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    // Insert order: order_source = 'pos'
    const { data: order, error: orderErr } = await db
      .from("restaurant_orders")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        table_id: table.id,
        table_session_id: activeSession.id,
        session_token: activeSession.session_token || crypto.randomUUID(),
        status: "placed",
        notes: notes || null,
        total_amount: totalAmount,
        order_source: "pos",
        created_by_staff_id: verifiedStaffId,
      })
      .select("id, status, notes, total_amount, order_source, created_by_staff_id, created_at")
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: orderErr?.message || "Failed to create order" }, { status: 500 });
    }

    const finalItemsToInsert = orderItemsToInsert.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    await db.from("restaurant_order_items").insert(finalItemsToInsert);

    await db.from("restaurant_order_events").insert({
      tenant_id: tenantId,
      order_id: order.id,
      from_status: null,
      to_status: "placed",
      changed_by_staff_id: verifiedStaffId,
      notes: "Order placed via POS terminal",
    });

    const enrichedTable = {
      id: table.id,
      table_number: table.table_number,
      floor_id: table.floor_id || null,
      floor_name: (table as any).restaurant_floors?.name || null,
    };

    return NextResponse.json({
      order: {
        ...order,
        staff_name: verifiedStaffName,
        table: enrichedTable,
        items: finalItemsToInsert,
      },
      session_id: activeSession.id,
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
