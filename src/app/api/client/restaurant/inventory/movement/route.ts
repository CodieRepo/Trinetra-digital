import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext, RestaurantContextError } from "../../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId, isAuthenticated } = await resolveRestaurantContext(request);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (!restaurantId || !tenantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const itemId = searchParams.get("inventory_item_id");

    let query = db
      .from("restaurant_stock_movements")
      .select(`
        id,
        inventory_item_id,
        order_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        actor_name,
        notes,
        created_at,
        restaurant_inventory_items ( id, name, unit, category )
      `)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (itemId) {
      query = query.eq("inventory_item_id", itemId);
    }

    const { data: movements, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      movements: movements || [],
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));
    const { tenantId, restaurantId, isAuthenticated } = await resolveRestaurantContext(request, body);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (!restaurantId || !tenantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 400 });
    }

    const {
      inventory_item_id,
      movement_type,
      quantity,
      actor_name,
      notes,
    } = body;

    if (!inventory_item_id) {
      return NextResponse.json({ error: "inventory_item_id is required" }, { status: 400 });
    }

    const validMovements = ["purchase_in", "wastage_spoilage", "manual_adjustment"];
    if (!movement_type || !validMovements.includes(movement_type)) {
      return NextResponse.json({
        error: `Invalid movement_type. Allowed: ${validMovements.join(", ")}`,
      }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }

    // 1. Fetch target item
    const { data: item, error: findErr } = await db
      .from("restaurant_inventory_items")
      .select("id, name, unit, current_stock")
      .eq("id", inventory_item_id)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (findErr || !item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const prevStock = Number(item.current_stock) || 0;
    let newStock = prevStock;
    let delta = qty;

    if (movement_type === "purchase_in") {
      newStock = prevStock + qty;
      delta = qty;
    } else if (movement_type === "wastage_spoilage") {
      newStock = Math.max(0, prevStock - qty);
      delta = -qty;
    } else if (movement_type === "manual_adjustment") {
      newStock = qty;
      delta = qty - prevStock;
    }

    newStock = Math.round(newStock * 1000) / 1000;
    delta = Math.round(delta * 1000) / 1000;

    // 2. Update stock level
    const { data: updatedItem, error: updateErr } = await db
      .from("restaurant_inventory_items")
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventory_item_id)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Insert audit log movement
    const { data: movement, error: movErr } = await db
      .from("restaurant_stock_movements")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        inventory_item_id: inventory_item_id,
        movement_type: movement_type,
        quantity: delta,
        previous_stock: prevStock,
        new_stock: newStock,
        actor_name: actor_name || "Manager",
        notes: notes ? notes.trim() : null,
      })
      .select("*")
      .single();

    if (movErr) {
      console.warn("⚠️ Stock movement log insert warning:", movErr.message);
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      movement,
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
