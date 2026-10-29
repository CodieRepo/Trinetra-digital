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
    const menuItemId = searchParams.get("menu_item_id");

    let query = db
      .from("restaurant_recipe_items")
      .select(`
        id,
        menu_item_id,
        inventory_item_id,
        quantity_consumed,
        unit,
        notes,
        created_at,
        menu_items ( id, name, price ),
        restaurant_inventory_items ( id, name, unit, cost_per_unit, current_stock )
      `)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId);

    if (menuItemId) {
      query = query.eq("menu_item_id", menuItemId);
    }

    const { data: recipes, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group ingredients by menu_item_id
    const groupedMap = new Map<string, {
      menu_item_id: string;
      menu_item_name: string;
      menu_item_price: number;
      estimated_cogs: number; // Cost of goods sold
      ingredients: any[];
    }>();

    for (const r of recipes || []) {
      const mItem = (r as any).menu_items;
      const invItem = (r as any).restaurant_inventory_items;
      const costPerUnit = Number(invItem?.cost_per_unit) || 0;
      const qty = Number(r.quantity_consumed) || 0;
      const ingredientCost = Math.round(costPerUnit * qty * 100) / 100;

      const existing: {
        menu_item_id: string;
        menu_item_name: string;
        menu_item_price: number;
        estimated_cogs: number;
        ingredients: any[];
      } = groupedMap.get(r.menu_item_id) || {
        menu_item_id: r.menu_item_id,
        menu_item_name: mItem?.name || "Unknown Dish",
        menu_item_price: Number(mItem?.price) || 0,
        estimated_cogs: 0,
        ingredients: [],
      };

      existing.estimated_cogs += ingredientCost;
      existing.ingredients.push({
        id: r.id,
        inventory_item_id: r.inventory_item_id,
        ingredient_name: invItem?.name || "Raw Item",
        quantity_consumed: qty,
        unit: r.unit || invItem?.unit || "kg",
        cost_per_unit: costPerUnit,
        ingredient_cost: ingredientCost,
        current_stock: Number(invItem?.current_stock) || 0,
        notes: r.notes || null,
      });

      groupedMap.set(r.menu_item_id, existing);
    }

    const recipeList = Array.from(groupedMap.values()).map((g) => ({
      ...g,
      estimated_cogs: Math.round(g.estimated_cogs * 100) / 100,
      gross_margin_percent: g.menu_item_price > 0
        ? Math.round(((g.menu_item_price - g.estimated_cogs) / g.menu_item_price) * 100)
        : 0,
    }));

    return NextResponse.json({
      success: true,
      recipes: recipeList,
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

    const { menu_item_id, ingredients } = body;

    if (!menu_item_id) {
      return NextResponse.json({ error: "menu_item_id is required" }, { status: 400 });
    }

    if (!Array.isArray(ingredients)) {
      return NextResponse.json({ error: "ingredients must be an array" }, { status: 400 });
    }

    // 1. Verify menu item exists
    const { data: menuItem, error: miErr } = await db
      .from("menu_items")
      .select("id, name")
      .eq("id", menu_item_id)
      .eq("tenant_id", tenantId)
      .single();

    if (miErr || !menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // 2. Delete existing recipe ingredients for this menu item
    await db
      .from("restaurant_recipe_items")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .eq("menu_item_id", menu_item_id);

    // 3. Insert new ingredients if non-empty
    if (ingredients.length > 0) {
      const toInsert = ingredients.map((ing: any) => ({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        menu_item_id: menu_item_id,
        inventory_item_id: ing.inventory_item_id,
        quantity_consumed: Math.max(0.001, Number(ing.quantity_consumed) || 0.1),
        unit: (ing.unit || "kg").toLowerCase().trim(),
        notes: ing.notes ? ing.notes.trim() : null,
      }));

      const { error: insErr } = await db
        .from("restaurant_recipe_items")
        .insert(toInsert);

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      menu_item_id,
      ingredient_count: ingredients.length,
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
