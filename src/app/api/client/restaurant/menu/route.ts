import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

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

      // Always sync category row to legacy categories table to satisfy legacy foreign keys
      try {
        const defaultBranchId = "abe32f5f-aabe-4962-ac38-710e5b8cc5e3";
        try {
          await db.from("branches").upsert({
            id: defaultBranchId,
            name: "Main Branch",
            is_active: true,
          }, { onConflict: "id" });
        } catch (e) {}

        try {
          await db.from("categories").upsert({
            id: data.id,
            branch_id: defaultBranchId,
            name: data.name,
            sort_order: data.display_order || 1,
          }, { onConflict: "id" });
        } catch (e) {}
      } catch (syncErr) {
        console.warn("[MenuAPI] Legacy categories sync warning:", syncErr);
      }

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

      // 2. If requested category is invalid for this restaurant, fallback to restaurant's first category
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
          // If restaurant has no categories yet, auto-create default Starters category
          const { data: newCat, error: newCatErr } = await db
            .from("menu_categories")
            .insert({
              tenant_id: tenantId,
              restaurant_id: restaurantId,
              name: "Starters",
              display_order: 1,
            })
            .select("id, name, display_order")
            .single();

          if (newCatErr || !newCat) {
            return NextResponse.json({ error: "Please create a menu category first." }, { status: 400 });
          }
          activeCat = newCat;
        }
      }

      resolvedCategoryId = activeCat.id;

      // 3. Dual-sync to legacy categories table to satisfy any legacy foreign key constraint
      const defaultBranchId = "abe32f5f-aabe-4962-ac38-710e5b8cc5e3";
      try {
        await db.from("branches").upsert({
          id: defaultBranchId,
          name: "Main Branch",
          is_active: true,
        }, { onConflict: "id" });
      } catch (e) {}

      try {
        await db.from("categories").upsert({
          id: resolvedCategoryId,
          branch_id: defaultBranchId,
          name: activeCat.name,
          sort_order: activeCat.display_order || 1,
        }, { onConflict: "id" });
      } catch (e) {}

      // 4. Insert menu item with verified resolvedCategoryId
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
    const { tenantId } = await resolveRestaurantContext(request, body);

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId } = await resolveRestaurantContext(request, body);
    const table = body.type === "category" ? "menu_categories" : "menu_items";

    const { error } = await db
      .from(table)
      .delete()
      .eq("id", body.id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
