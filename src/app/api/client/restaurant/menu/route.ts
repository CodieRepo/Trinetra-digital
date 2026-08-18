import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  resolveRestaurantContext,
  requireStaffRole,
  RestaurantContextError,
} from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ categories: [], items: [] });

    const [catResult, itemResult] = await Promise.all([
      db
        .from("menu_categories")
        .select("id, name, display_order, is_active")
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true }),
      db
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url, is_available, is_veg, display_order")
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true }),
    ]);

    if (catResult.error) return NextResponse.json({ error: catResult.error.message }, { status: 500 });
    if (itemResult.error) return NextResponse.json({ error: itemResult.error.message }, { status: 500 });

    return NextResponse.json({
      categories: catResult.data || [],
      items: itemResult.data || [],
    });
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
    const body = await request.json();
    const { tenantId, restaurantId } = await requireStaffRole(request, ["owner", "manager"], body);
    if (!restaurantId) return NextResponse.json({ error: "No restaurant found" }, { status: 404 });

    if (body.type === "category") {
      if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
      }

      const { count } = await db
        .from("menu_categories")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId);

      const { data, error } = await db
        .from("menu_categories")
        .insert({
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name: body.name.trim(),
          display_order: (count || 0) + 1,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true, category: data });
    }

    if (body.type === "item") {
      if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Menu item name is required" }, { status: 400 });
      }
      const priceVal = Number(body.price);
      if (isNaN(priceVal) || priceVal < 0) {
        return NextResponse.json({ error: "Price must be a valid positive number" }, { status: 400 });
      }

      let resolvedCategoryId = typeof body.category_id === "string" ? body.category_id.trim() : "";

      // 1. Verify category exists for THIS specific tenant and restaurant
      let activeCat: { id: string; name: string; display_order: number } | null = null;
      if (resolvedCategoryId) {
        const { data: catCheck } = await db
          .from("menu_categories")
          .select("id, name, display_order")
          .eq("id", resolvedCategoryId)
          .eq("tenant_id", tenantId)
          .eq("restaurant_id", restaurantId)
          .maybeSingle();
        if (catCheck) activeCat = catCheck;
      }

      // 2. Fallback: Find first category in restaurant or create default
      if (!activeCat) {
        const { data: firstCat } = await db
          .from("menu_categories")
          .select("id, name, display_order")
          .eq("tenant_id", tenantId)
          .eq("restaurant_id", restaurantId)
          .order("display_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCat) {
          activeCat = firstCat;
        } else {
          // Create default category
          const { data: newCat, error: createCatErr } = await db
            .from("menu_categories")
            .insert({
              tenant_id: tenantId,
              restaurant_id: restaurantId,
              name: "General Menu",
              display_order: 1,
            })
            .select("id, name, display_order")
            .single();

          if (createCatErr || !newCat) {
            return NextResponse.json({ error: "Please create a menu category first." }, { status: 400 });
          }
          activeCat = newCat;
        }
      }

      resolvedCategoryId = activeCat.id;

      // 3. Insert menu item with verified resolvedCategoryId
      const { data, error } = await db
        .from("menu_items")
        .insert({
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          category_id: resolvedCategoryId,
          name: body.name.trim(),
          description: body.description ? String(body.description).trim() : null,
          price: priceVal,
          is_veg: body.is_veg ?? true,
          display_order: body.display_order || 0,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, item: data });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
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
    const body = await request.json();
    const { tenantId } = await requireStaffRole(request, ["owner", "manager"], body);

    if (body.type === "item") {
      const updates: Record<string, unknown> = {};
      if (body.is_available !== undefined) updates.is_available = body.is_available;
      if (body.name !== undefined) updates.name = body.name;
      if (body.price !== undefined) updates.price = body.price;

      const { error } = await db
        .from("menu_items")
        .update(updates)
        .eq("id", body.id)
        .eq("tenant_id", tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId } = await requireStaffRole(request, ["owner", "manager"], body);
    const table = body.type === "category" ? "menu_categories" : "menu_items";

    const { error } = await db
      .from(table)
      .delete()
      .eq("id", body.id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
