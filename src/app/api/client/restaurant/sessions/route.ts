import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext, RestaurantContextError } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId, isAuthenticated } = await resolveRestaurantContext(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!restaurantId) return NextResponse.json({ sessions: [] });

    const { data: sessions, error } = await db
      .from("restaurant_table_sessions")
      .select("id, table_id, status, opened_at, customer_name, customer_phone, payment_status, paid_at")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .order("opened_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sessionIds = sessions.map((s) => s.id);
    const tableIds = Array.from(new Set(sessions.map((s) => s.table_id).filter(Boolean)));

    // Concurrent batch fetch to eliminate N+1 queries
    const [tablesRes, ordersRes, billsRes] = await Promise.all([
      tableIds.length > 0
        ? db
            .from("restaurant_tables")
            .select("id, table_number, floor_id, restaurant_floors ( id, name )")
            .in("id", tableIds)
            .eq("tenant_id", tenantId)
        : Promise.resolve({ data: [] }),
      db
        .from("restaurant_orders")
        .select("id, table_session_id, status, total_amount, created_at, order_source, created_by_staff_id")
        .in("table_session_id", sessionIds)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true }),
      db
        .from("restaurant_bills")
        .select("*")
        .in("session_id", sessionIds),
    ]);

    const tables = tablesRes.data || [];
    const orders = ordersRes.data || [];
    const bills = billsRes.data || [];

    const orderIds = orders.map((o) => o.id);
    const { data: allItems } = orderIds.length > 0
      ? await db
          .from("restaurant_order_items")
          .select("id, order_id, name, quantity, notes")
          .in("order_id", orderIds)
          .eq("tenant_id", tenantId)
      : { data: [] };

    // In-memory indexing
    const tableMap = new Map();
    for (const t of tables) {
      tableMap.set(t.id, {
        id: t.id,
        table_number: t.table_number,
        floor_id: t.floor_id || null,
        floor_name: (t as any).restaurant_floors?.name || (t as any).restaurant_floors?.[0]?.name || null,
      });
    }

    const itemsByOrder = new Map();
    for (const item of (allItems || [])) {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    const ordersBySession = new Map();
    for (const order of orders) {
      const enrichedOrder = {
        ...order,
        items: itemsByOrder.get(order.id) || [],
      };
      const list = ordersBySession.get(order.table_session_id) || [];
      list.push(enrichedOrder);
      ordersBySession.set(order.table_session_id, list);
    }

    const billBySession = new Map();
    for (const b of bills) {
      billBySession.set(b.session_id, b);
    }

    const terminalStatuses = ["closed", "cancelled", "served"];
    const enriched = sessions.map((session) => {
      const enrichedTable = tableMap.get(session.table_id) || null;
      const sessionOrders = ordersBySession.get(session.id) || [];
      const orderCount = sessionOrders.length;
      const sessionTotal = sessionOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      const allOrdersTerminal =
        orderCount > 0 && sessionOrders.every((o: any) => terminalStatuses.includes(o.status));
      const bill = billBySession.get(session.id) || null;

      return {
        ...session,
        table: enrichedTable,
        orders: sessionOrders,
        order_count: orderCount,
        session_total: sessionTotal,
        all_orders_terminal: allOrdersTerminal,
        bill,
      };
    });

    return NextResponse.json({ sessions: enriched });
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
    const { tenantId, restaurantId, isAuthenticated } = await resolveRestaurantContext(request, body);
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant context required" }, { status: 400 });
    }

    const { table_id, customer_name, customer_phone } = body;
    if (!table_id) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    // Verify table belongs to this restaurant and is active
    const { data: table, error: tableErr } = await db
      .from("restaurant_tables")
      .select("id, table_number, is_active")
      .eq("id", table_id)
      .eq("restaurant_id", restaurantId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (tableErr || !table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (table.is_active === false) {
      return NextResponse.json({ error: "Table is inactive" }, { status: 400 });
    }

    // Check if an active session already exists for this table
    const { data: existingActive } = await db
      .from("restaurant_table_sessions")
      .select("id, table_id, customer_name, customer_phone, status, opened_at")
      .eq("table_id", table_id)
      .eq("restaurant_id", restaurantId)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle();

    if (existingActive) {
      return NextResponse.json({
        success: true,
        already_active: true,
        message: `Table ${table.table_number} already has an active dining session`,
        session: existingActive,
      });
    }

    // Sanitize guest inputs
    let cleanName: string | null = null;
    let cleanPhone: string | null = null;

    if (customer_name && typeof customer_name === "string") {
      const trimmed = customer_name.trim();
      if (trimmed.length > 0) cleanName = trimmed.slice(0, 100);
    }

    if (customer_phone && typeof customer_phone === "string") {
      const digits = customer_phone.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 15) {
        cleanPhone = digits;
      }
    }

    // Start new session
    const { data: newSession, error: createErr } = await db
      .from("restaurant_table_sessions")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        table_id: table_id,
        customer_name: cleanName,
        customer_phone: cleanPhone,
        status: "active",
        payment_status: "unpaid",
        opened_at: new Date().toISOString(),
      })
      .select("id, table_id, customer_name, customer_phone, status, payment_status, opened_at")
      .single();

    if (createErr || !newSession) {
      return NextResponse.json(
        { error: createErr?.message || "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Dining session started for Table ${table.table_number}`,
        session: newSession,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));
    const { tenantId, restaurantId, isAuthenticated } = await resolveRestaurantContext(request, body);
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_id, target_table_id, customer_name, customer_phone } = body;
    if (!session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    // Fetch existing session
    const { data: session, error: sessErr } = await db
      .from("restaurant_table_sessions")
      .select("id, table_id, status, customer_name, customer_phone")
      .eq("id", session_id)
      .eq("restaurant_id", restaurantId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Cannot modify a closed session" },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};

    // 1. Table transfer / table move workflow
    if (target_table_id && target_table_id !== session.table_id) {
      // Verify target table
      const { data: targetTable, error: targetErr } = await db
        .from("restaurant_tables")
        .select("id, table_number, is_active")
        .eq("id", target_table_id)
        .eq("restaurant_id", restaurantId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (targetErr || !targetTable) {
        return NextResponse.json({ error: "Target table not found" }, { status: 404 });
      }

      if (targetTable.is_active === false) {
        return NextResponse.json(
          { error: `Table ${targetTable.table_number} is inactive` },
          { status: 400 }
        );
      }

      // Ensure target table is NOT occupied
      const { data: targetOccupied } = await db
        .from("restaurant_table_sessions")
        .select("id")
        .eq("table_id", target_table_id)
        .eq("restaurant_id", restaurantId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .maybeSingle();

      if (targetOccupied) {
        return NextResponse.json(
          {
            error: `Cannot transfer session: Table ${targetTable.table_number} is already occupied.`,
          },
          { status: 409 }
        );
      }

      updates.table_id = target_table_id;

      // Update table_id on all active orders associated with this session
      await db
        .from("restaurant_orders")
        .update({ table_id: target_table_id })
        .eq("table_session_id", session_id)
        .eq("tenant_id", tenantId);
    }

    // 2. Customer details update
    if (customer_name !== undefined) {
      updates.customer_name =
        typeof customer_name === "string" ? customer_name.trim().slice(0, 100) || null : null;
    }

    if (customer_phone !== undefined) {
      if (typeof customer_phone === "string") {
        const digits = customer_phone.replace(/\D/g, "");
        updates.customer_phone = digits.length >= 10 && digits.length <= 15 ? digits : null;
      } else {
        updates.customer_phone = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: "No changes requested", session });
    }

    const { data: updatedSession, error: updateErr } = await db
      .from("restaurant_table_sessions")
      .update(updates)
      .eq("id", session_id)
      .eq("restaurant_id", restaurantId)
      .eq("tenant_id", tenantId)
      .select("id, table_id, customer_name, customer_phone, status, payment_status, opened_at")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Session updated successfully",
      session: updatedSession,
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
