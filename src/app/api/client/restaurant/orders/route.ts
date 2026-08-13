import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ orders: [] });

    const { data: orders, error } = await db
      .from("restaurant_orders")
      .select("id, status, notes, total_amount, created_at, updated_at, table_id, table_session_id")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enriched = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: table } = await db
          .from("restaurant_tables")
          .select("id, table_number")
          .eq("id", order.table_id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const { data: items } = await db
          .from("restaurant_order_items")
          .select("id, name, quantity, price, notes")
          .eq("order_id", order.id)
          .eq("tenant_id", tenantId);

        return { ...order, table: table || null, items: items || [] };
      })
    );

    return NextResponse.json({ orders: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
