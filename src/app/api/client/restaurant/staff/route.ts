import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ staff: [] });

    const { data, error } = await db
      .from("restaurant_staff")
      .select("id, name, role, access_token, is_active, created_at")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data || [] });
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
      .from("restaurant_staff")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        name: body.name,
        role: body.role || "kitchen",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data });
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

    const { error } = await db
      .from("restaurant_staff")
      .delete()
      .eq("id", body.staff_id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
