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
    if (!restaurantId) return NextResponse.json({ staff: [] });

    const { data, error } = await db
      .from("restaurant_staff")
      .select("id, name, role, access_token, is_active, created_at")
      .eq("tenant_id", TENANT_ID)
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
    const restaurantId = await getRestaurantId(db);
    if (!restaurantId) return NextResponse.json({ error: "No restaurant found" }, { status: 404 });

    const body = await request.json();
    const { data, error } = await db
      .from("restaurant_staff")
      .insert({
        tenant_id: TENANT_ID,
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

    const { error } = await db
      .from("restaurant_staff")
      .delete()
      .eq("id", body.staff_id)
      .eq("tenant_id", TENANT_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
