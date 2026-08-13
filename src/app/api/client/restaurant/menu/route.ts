import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!tenantId || !restaurantId) return NextResponse.json({ categories: [], items: [] });

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);
    if (!tenantId || !restaurantId) {
      return NextResponse.json({ error: "Unauthorized or invalid restaurant context" }, { status: 403 });
    }

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

      if (resolvedCategoryId) {
        // 1. If explicit category_id supplied, strictly verify ownership by THIS tenant & restaurant
        const { data: catCheck } = await db
          .from("menu_categories")
          .select("id")
          .eq("id", resolvedCategoryId)
          .eq("tenant_id", tenantId)
          .eq("restaurant_id", restaurantId)
          .maybeSingle();

        if (!catCheck) {
          // Explicit category_id supplied but invalid/unauthorized for this restaurant -> REJECT
          return NextResponse.json(
            { error: "Invalid or unauthorized category_id for this restaurant" },
            { status: 400 }
          );
        }
      } else {
        // 2. Only if category_id is omitted/empty, find or create default category for this restaurant
        const { data: firstCat } = await db
          .from("menu_categories")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("restaurant_id", restaurantId)
          .order("display_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCat) {
          resolvedCategoryId = firstCat.id;
        } else {
          const { data: newCat, error: newCatErr } = await db
            .from("menu_categories")
            .insert({
              tenant_id: tenantId,
              restaurant_id: restaurantId,
              name: "Starters",
              display_order: 1,
            })
            .select("id")
            .single();

          if (newCatErr || !newCat) {
            return NextResponse.json({ error: "Please create a menu category first." }, { status: 400 });
          }
          resolvedCategoryId = newCat.id;
        }
      }

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);
    if (!tenantId || !restaurantId) {
      return NextResponse.json({ error: "Unauthorized or invalid restaurant context" }, { status: 403 });
    }

    if (body.type === "item") {
      if (!body.id) {
        return NextResponse.json({ error: "Menu item ID is required" }, { status: 400 });
      }

      // Verify item exists and is owned by THIS restaurant & tenant
      const { data: existingItem } = await db
        .from("menu_items")
        .select("id")
        .eq("id", body.id)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (!existingItem) {
        return NextResponse.json({ error: "Menu item not found or unauthorized" }, { status: 404 });
      }

      const updates: Record<string, unknown> = {};
      if (body.is_available !== undefined) updates.is_available = body.is_available;
      if (body.name !== undefined) updates.name = body.name;
      if (body.price !== undefined) updates.price = body.price;

      if (body.category_id !== undefined) {
        const targetCatId = String(body.category_id).trim();
        const { data: catCheck } = await db
          .from("menu_categories")
          .select("id")
          .eq("id", targetCatId)
          .eq("tenant_id", tenantId)
          .eq("restaurant_id", restaurantId)
          .maybeSingle();

        if (!catCheck) {
          return NextResponse.json(
            { error: "Invalid or unauthorized category_id for this restaurant" },
            { status: 400 }
          );
        }
        updates.category_id = targetCatId;
      }

      const { error } = await db
        .from("menu_items")
        .update(updates)
        .eq("id", body.id)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);
    if (!tenantId || !restaurantId) {
      return NextResponse.json({ error: "Unauthorized or invalid restaurant context" }, { status: 403 });
    }

    const table = body.type === "category" ? "menu_categories" : "menu_items";

    const { error } = await db
      .from(table)
      .delete()
      .eq("id", body.id)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
