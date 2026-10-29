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
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (!restaurantId || !tenantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const lowStockOnly = searchParams.get("low_stock") === "true";

    let query = db
      .from("restaurant_inventory_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: items, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with low stock computation and stock value
    const enriched = (items || []).map((item) => {
      const currentStock = Number(item.current_stock) || 0;
      const minAlert = Number(item.min_stock_alert) || 0;
      const costPerUnit = Number(item.cost_per_unit) || 0;
      const isLowStock = currentStock <= minAlert;
      const totalValuation = Math.round(currentStock * costPerUnit * 100) / 100;

      return {
        ...item,
        current_stock: currentStock,
        min_stock_alert: minAlert,
        cost_per_unit: costPerUnit,
        is_low_stock: isLowStock,
        total_valuation: totalValuation,
      };
    });

    const finalItems = lowStockOnly ? enriched.filter((i) => i.is_low_stock) : enriched;

    const summary = {
      totalItems: enriched.length,
      lowStockCount: enriched.filter((i) => i.is_low_stock).length,
      totalInventoryValuation: enriched.reduce((sum, i) => sum + i.total_valuation, 0),
    };

    return NextResponse.json({
      success: true,
      items: finalItems,
      summary,
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
      id,
      name,
      sku,
      category,
      unit,
      current_stock,
      min_stock_alert,
      cost_per_unit,
      supplier_name,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Inventory item name is required" }, { status: 400 });
    }
    if (!unit || typeof unit !== "string" || !unit.trim()) {
      return NextResponse.json({ error: "Measurement unit is required (e.g. kg, g, l, pcs)" }, { status: 400 });
    }

    const stockQty = Math.max(0, Number(current_stock) || 0);
    const minAlert = Math.max(0, Number(min_stock_alert) || 5);
    const cost = Math.max(0, Number(cost_per_unit) || 0);

    // If ID is provided, update existing
    if (id) {
      const { data: existing, error: findErr } = await db
        .from("restaurant_inventory_items")
        .select("id, current_stock")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .single();

      if (findErr || !existing) {
        return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
      }

      const { data: updated, error: updateErr } = await db
        .from("restaurant_inventory_items")
        .update({
          name: name.trim(),
          sku: sku ? sku.trim() : null,
          category: category || "raw_material",
          unit: unit.trim().toLowerCase(),
          min_stock_alert: minAlert,
          cost_per_unit: cost,
          supplier_name: supplier_name ? supplier_name.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, item: updated });
    }

    // Insert new item
    const { data: inserted, error: insertErr } = await db
      .from("restaurant_inventory_items")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        category: category || "raw_material",
        unit: unit.trim().toLowerCase(),
        current_stock: stockQty,
        min_stock_alert: minAlert,
        cost_per_unit: cost,
        supplier_name: supplier_name ? supplier_name.trim() : null,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message || "Failed to create item" }, { status: 500 });
    }

    // Record initial stock movement audit log
    if (stockQty > 0) {
      await db.from("restaurant_stock_movements").insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        inventory_item_id: inserted.id,
        movement_type: "manual_adjustment",
        quantity: stockQty,
        previous_stock: 0,
        new_stock: stockQty,
        notes: "Initial inventory setup",
      });
    }

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
