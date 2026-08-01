import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ tables: [] });

    const { data, error } = await db
      .from("restaurant_tables")
      .select("id, table_number, table_token, is_active, created_at")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("table_number", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tables: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);
    if (!restaurantId) return NextResponse.json({ error: "No restaurant found" }, { status: 404 });

    const { data, error } = await db
      .from("restaurant_tables")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        table_number: body.table_number,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ table: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId } = await resolveRestaurantContext(request, body);
    const tableId = body.table_id;

    if (!tableId) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    // 1. Find all orders associated with this table station
    const { data: linkedOrders } = await db
      .from("restaurant_orders")
      .select("id")
      .eq("table_id", tableId)
      .eq("tenant_id", tenantId);

    if (linkedOrders && linkedOrders.length > 0) {
      const orderIds = linkedOrders.map((o) => o.id);
      // Delete order items & orders
      await db.from("restaurant_order_items").delete().in("order_id", orderIds);
      await db.from("restaurant_orders").delete().in("id", orderIds);
    }

    // 2. Delete table sessions associated with this table
    await db
      .from("restaurant_table_sessions")
      .delete()
      .eq("table_id", tableId)
      .eq("tenant_id", tenantId);

    // 3. Delete the table record
    const { error } = await db
      .from("restaurant_tables")
      .delete()
      .eq("id", tableId)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
