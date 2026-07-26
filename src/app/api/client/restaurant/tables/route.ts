import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function getRestaurantId(db: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await db
    .from("restaurants")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const restaurantId = await getRestaurantId(db);
    if (!restaurantId) return NextResponse.json({ tables: [] });

    const { data, error } = await db
      .from("restaurant_tables")
      .select("id, table_number, table_token, is_active, created_at")
      .eq("tenant_id", TENANT_ID)
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
    const restaurantId = await getRestaurantId(db);
    if (!restaurantId) return NextResponse.json({ error: "No restaurant found" }, { status: 404 });

    const body = await request.json();
    const { data, error } = await db
      .from("restaurant_tables")
      .insert({
        tenant_id: TENANT_ID,
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
    const tableId = body.table_id;

    if (!tableId) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    // 1. Find all orders associated with this table station
    const { data: linkedOrders } = await db
      .from("restaurant_orders")
      .select("id")
      .eq("table_id", tableId)
      .eq("tenant_id", TENANT_ID);

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
      .eq("tenant_id", TENANT_ID);

    // 3. Delete the table record
    const { error } = await db
      .from("restaurant_tables")
      .delete()
      .eq("id", tableId)
      .eq("tenant_id", TENANT_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
