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
    if (!restaurantId) return NextResponse.json({ categories: [], items: [] });

    const [catResult, itemResult] = await Promise.all([
      db
        .from("menu_categories")
        .select("id, name, display_order, is_active")
        .eq("tenant_id", TENANT_ID)
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true }),
      db
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url, is_available, is_veg, display_order")
        .eq("tenant_id", TENANT_ID)
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
    const restaurantId = await getRestaurantId(db);
    if (!restaurantId) return NextResponse.json({ error: "No restaurant found" }, { status: 404 });

    const body = await request.json();

    if (body.type === "category") {
      const { count } = await db
        .from("menu_categories")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", TENANT_ID)
        .eq("restaurant_id", restaurantId);

      const { data, error } = await db
        .from("menu_categories")
        .insert({
          tenant_id: TENANT_ID,
          restaurant_id: restaurantId,
          name: body.name,
          display_order: (count || 0) + 1,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, category: data });
    }

    if (body.type === "item") {
      const { data, error } = await db
        .from("menu_items")
        .insert({
          tenant_id: TENANT_ID,
          restaurant_id: restaurantId,
          category_id: body.category_id,
          name: body.name,
          description: body.description || null,
          price: body.price,
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

    if (body.type === "item") {
      const updates: Record<string, unknown> = {};
      if (body.is_available !== undefined) updates.is_available = body.is_available;
      if (body.name !== undefined) updates.name = body.name;
      if (body.price !== undefined) updates.price = body.price;

      const { error } = await db
        .from("menu_items")
        .update(updates)
        .eq("id", body.id)
        .eq("tenant_id", TENANT_ID);

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
    const table = body.type === "category" ? "menu_categories" : "menu_items";

    const { error } = await db
      .from(table)
      .delete()
      .eq("id", body.id)
      .eq("tenant_id", TENANT_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
