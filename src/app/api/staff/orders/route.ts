import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { authenticateStaffRequest } from "@/lib/auth/staff-api-auth";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedRestaurantId = url.searchParams.get("restaurant_id");

    const { context: staff, errorResponse } = await authenticateStaffRequest(request, null, requestedRestaurantId);
    if (errorResponse || !staff) {
      return NextResponse.json({ error: errorResponse?.message || "Unauthorized" }, { status: errorResponse?.status || 401 });
    }

    const targetRestaurantId = staff.restaurant_id;
    const db = getSupabaseAdmin();

    const queryStatus = url.searchParams.get("status");
    let statuses = staff.role === "kitchen"
      ? ["placed", "accepted", "preparing", "ready"]
      : ["placed", "accepted", "preparing", "ready", "served"];
    if (queryStatus) {
      statuses = queryStatus.split(",").map((s) => s.trim());
    }

    // Query restaurant_orders with source and staff attribution
    const { data: orders, error: ordersErr } = await db
      .from("restaurant_orders")
      .select("id, table_id, table_session_id, status, notes, total_amount, created_at, updated_at, order_source, created_by_staff_id")
      .eq("tenant_id", staff.tenant_id)
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
    const staffIds = Array.from(new Set(orders.map((o) => o.created_by_staff_id).filter(Boolean))) as string[];

    // Fetch tables (with floor join), staff, & order items in parallel
    const [tablesRes, staffRes, itemsRes] = await Promise.all([
      tableIds.length > 0
        ? db
            .from("restaurant_tables")
            .select("id, table_number, floor_id, restaurant_floors ( id, name )")
            .in("id", tableIds)
        : Promise.resolve({ data: [], error: null }),
      staffIds.length > 0
        ? db
            .from("restaurant_staff")
            .select("id, name, role")
            .in("id", staffIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length > 0
        ? db
            .from("restaurant_order_items")
            .select("id, order_id, name, quantity, price, notes")
            .in("order_id", orderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (tablesRes.error) {
      return NextResponse.json({ error: tablesRes.error.message }, { status: 500 });
    }
    if (staffRes.error) {
      return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
    }
    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }

    const tablesMap = new Map((tablesRes.data || []).map((t: any) => [t.id, t]));
    const staffMap = new Map((staffRes.data || []).map((s: any) => [s.id, s]));
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

    const hydratedOrders = orders.map((o: any) => {
      const table = o.table_id ? tablesMap.get(o.table_id) : null;
      const creatorStaff = o.created_by_staff_id ? staffMap.get(o.created_by_staff_id) : null;
      return {
        id: o.id,
        table_id: o.table_id,
        table_session_id: o.table_session_id,
        status: o.status,
        notes: o.notes,
        total_amount: Number(o.total_amount),
        order_source: o.order_source || null,
        created_by_staff_id: o.created_by_staff_id || null,
        staff_name: creatorStaff?.name || null,
        created_at: o.created_at,
        updated_at: o.updated_at,
        table: table
          ? {
              id: table.id,
              table_number: table.table_number,
              floor_id: table.floor_id || null,
              floor_name: table.restaurant_floors?.name || null,
            }
          : null,
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { context: staff, errorResponse } = await authenticateStaffRequest(request, body, body.restaurant_id || null);
    if (errorResponse || !staff) {
      return NextResponse.json({ error: errorResponse?.message || "Unauthorized" }, { status: errorResponse?.status || 401 });
    }

    const { table_id, table_session_id, notes, items } = body;

    if (!table_id) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array cannot be empty" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Validate table belongs strictly to authenticated staff's tenant and restaurant
    const { data: table, error: tableErr } = await db
      .from("restaurant_tables")
      .select("id, tenant_id, restaurant_id, table_number, floor_id, is_active, restaurant_floors ( id, name )")
      .eq("id", table_id)
      .eq("tenant_id", staff.tenant_id)
      .eq("restaurant_id", staff.restaurant_id)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json({ error: "Table not found or inactive in this restaurant" }, { status: 404 });
    }

    // Locate active session or create a new session
    let activeSession: any = null;
    if (table_session_id) {
      const { data: s } = await db
        .from("restaurant_table_sessions")
        .select("id, tenant_id, restaurant_id, session_token, payment_status, status")
        .eq("id", table_session_id)
        .eq("tenant_id", staff.tenant_id)
        .eq("restaurant_id", staff.restaurant_id)
        .eq("table_id", table.id)
        .maybeSingle();
      if (s && s.status !== "closed") {
        activeSession = s;
      }
    }

    if (!activeSession) {
      // Find any active session for this table
      const { data: s } = await db
        .from("restaurant_table_sessions")
        .select("id, tenant_id, restaurant_id, session_token, payment_status, status")
        .eq("tenant_id", staff.tenant_id)
        .eq("restaurant_id", staff.restaurant_id)
        .eq("table_id", table.id)
        .eq("status", "active")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (s) {
        activeSession = s;
      } else {
        // Create new active session
        const sessionToken = crypto.randomUUID();
        const { data: newSession, error: createSessionErr } = await db
          .from("restaurant_table_sessions")
          .insert({
            tenant_id: staff.tenant_id,
            restaurant_id: staff.restaurant_id,
            table_id: table.id,
            session_token: sessionToken,
            status: "active",
            payment_status: "unpaid",
          })
          .select("id, tenant_id, restaurant_id, session_token, payment_status, status")
          .single();

        if (createSessionErr || !newSession) {
          return NextResponse.json(
            { error: createSessionErr?.message || "Failed to create table session" },
            { status: 400 }
          );
        }
        activeSession = newSession;
      }
    }

    if (activeSession.payment_status === "paid") {
      return NextResponse.json({ session_paid: true, error: "Bill already settled for this session" }, { status: 400 });
    }

    // Validate menu items & calculate total amount
    const menuItemIds = items.map((i: any) => i.menu_item_id || i.item_id);
    const { data: dbMenuItems, error: menuErr } = await db
      .from("menu_items")
      .select("id, name, price, is_available")
      .eq("tenant_id", staff.tenant_id)
      .eq("restaurant_id", staff.restaurant_id)
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
        return NextResponse.json(
          { error: `Menu item ${targetItemId} not found in this restaurant` },
          { status: 400 }
        );
      }
      if (dbItem.is_available === false) {
        return NextResponse.json(
          { error: `Item "${dbItem.name}" is currently unavailable` },
          { status: 400 }
        );
      }
      const qty = Math.floor(Number(item.quantity));
      if (!qty || qty <= 0 || !Number.isFinite(qty)) {
        return NextResponse.json(
          { error: `Invalid quantity for item "${dbItem.name}". Must be a positive integer.` },
          { status: 400 }
        );
      }
      const price = Number(dbItem.price) || 0;
      totalAmount += price * qty;

      orderItemsToInsert.push({
        tenant_id: staff.tenant_id,
        menu_item_id: dbItem.id,
        name: dbItem.name,
        price: price,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    // Insert order record: source = 'waiter', staff_id = verified staff ID
    const { data: order, error: orderErr } = await db
      .from("restaurant_orders")
      .insert({
        tenant_id: staff.tenant_id,
        restaurant_id: staff.restaurant_id,
        table_id: table.id,
        table_session_id: activeSession.id,
        session_token: activeSession.session_token || crypto.randomUUID(),
        status: "placed",
        notes: notes || null,
        total_amount: totalAmount,
        order_source: "waiter",
        created_by_staff_id: staff.staff_id,
      })
      .select("id, status, notes, total_amount, order_source, created_by_staff_id, created_at")
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: orderErr?.message || "Failed to create order" },
        { status: 500 }
      );
    }

    // Insert order items
    const finalItemsToInsert = orderItemsToInsert.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsErr } = await db
      .from("restaurant_order_items")
      .insert(finalItemsToInsert);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // Insert initial event in restaurant_order_events
    await db.from("restaurant_order_events").insert({
      tenant_id: staff.tenant_id,
      order_id: order.id,
      from_status: null,
      to_status: "placed",
      changed_by_staff_id: staff.staff_id,
      notes: "Order placed by waitstaff",
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
        staff_name: staff.name,
        table: enrichedTable,
        items: finalItemsToInsert,
      },
      session_id: activeSession.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
