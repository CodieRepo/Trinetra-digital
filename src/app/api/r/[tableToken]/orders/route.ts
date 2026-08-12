import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;

    if (!tableToken) {
      return NextResponse.json({ error: "tableToken is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { session_token, table_session_id, notes, items } = body;

    if (!session_token) {
      return NextResponse.json({ error: "session_token is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array cannot be empty" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Validate table
    const { data: table, error: tableErr } = await supabase
      .from("restaurant_tables")
      .select("id, tenant_id, restaurant_id, table_number, is_active")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    // Find active session
    let sessionQuery = supabase
      .from("restaurant_table_sessions")
      .select("id, tenant_id, restaurant_id, payment_status, status")
      .eq("table_id", table.id)
      .eq("session_token", session_token);

    if (table_session_id) {
      sessionQuery = sessionQuery.eq("id", table_session_id);
    }

    const { data: session } = await sessionQuery
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let activeSession = session;

    if (!activeSession || activeSession.status === "closed") {
      // Create new session if no active session found
      const { data: newSession, error: createSessionErr } = await supabase
        .from("restaurant_table_sessions")
        .insert({
          tenant_id: table.tenant_id,
          restaurant_id: table.restaurant_id,
          table_id: table.id,
          session_token: session_token,
          status: "active",
          payment_status: "unpaid",
        })
        .select("id, tenant_id, restaurant_id, payment_status, status")
        .single();

      if (createSessionErr || !newSession) {
        return NextResponse.json(
          { error: createSessionErr?.message || "Failed to locate or create table session" },
          { status: 400 }
        );
      }
      activeSession = newSession;
    }

    if (activeSession.payment_status === "paid") {
      return NextResponse.json({ session_paid: true, error: "Bill settled" }, { status: 400 });
    }

    // Calculate total amount from menu_items
    const menuItemIds = items.map((i: any) => i.menu_item_id || i.item_id);
    const { data: dbMenuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
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
          { error: `Menu item ${item.menu_item_id} not found` },
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
          { error: `Invalid quantity for item "${dbItem.name}". Quantity must be a positive number.` },
          { status: 400 }
        );
      }
      const price = Number(dbItem.price) || 0;
      totalAmount += price * qty;

      orderItemsToInsert.push({
        tenant_id: table.tenant_id,
        menu_item_id: dbItem.id,
        name: dbItem.name,
        price: price,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    // Insert order record (status: 'placed')
    const { data: order, error: orderErr } = await supabase
      .from("restaurant_orders")
      .insert({
        tenant_id: table.tenant_id,
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        table_session_id: activeSession.id,
        session_token: session_token,
        status: "placed",
        notes: notes || null,
        total_amount: totalAmount,
      })
      .select("id")
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

    const { error: itemsErr } = await supabase
      .from("restaurant_order_items")
      .insert(finalItemsToInsert);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // Insert initial event in restaurant_order_events
    const { error: eventErr } = await supabase
      .from("restaurant_order_events")
      .insert({
        tenant_id: table.tenant_id,
        order_id: order.id,
        from_status: null,
        to_status: "placed",
        actor_role: "customer",
        actor_id: String(session_token),
      });

    if (eventErr) {
      console.error("Failed to insert order event:", eventErr);
    }

    // Trigger post-commit FCM push notification dispatch (asynchronous, non-blocking)
    try {
      const { fcmNotificationService } = await import("@/services/fcmNotificationService");
      fcmNotificationService.dispatchOrderNotification({
        order_id: order.id,
        tenant_id: table.tenant_id,
        restaurant_id: table.restaurant_id,
        table_number: table.table_number,
        status: "placed",
        title: `🔔 New Order #${order.id.slice(0, 6)}`,
        body: `Table ${table.table_number} • ${orderItemsToInsert.length} items (Total: ₹${totalAmount})`,
        target_roles: ["kitchen", "manager", "owner"],
      }).catch((e) => console.error("[OrderApi] FCM dispatch background error:", e));
    } catch (pushErr) {
      console.error("[OrderApi] Notification dispatcher error:", pushErr);
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      table_session_id: activeSession.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
