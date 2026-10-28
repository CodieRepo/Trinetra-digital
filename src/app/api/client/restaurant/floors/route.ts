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
    if (!restaurantId) return NextResponse.json({ floors: [] });

    const { data, error } = await db
      .from("restaurant_floors")
      .select("id, name, display_order, is_active")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ floors: data || [] });
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

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Floor name is required" }, { status: 400 });
    }

    // Get current floor count for display order
    const { count } = await db
      .from("restaurant_floors")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId);

    const { data, error } = await db
      .from("restaurant_floors")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        name,
        display_order: (count || 0) + 1,
        is_active: true,
      })
      .select("id, name, display_order, is_active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, floor: data }, { status: 201 });
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
    const { tenantId, restaurantId } = await requireStaffRole(request, ["owner", "manager"], body);

    const floorId = body.floor_id;
    if (!floorId) {
      return NextResponse.json({ error: "floor_id is required" }, { status: 400 });
    }

    // 1. Unassign tables on this floor so they are preserved safely
    await db
      .from("restaurant_tables")
      .update({ floor_id: null })
      .eq("floor_id", floorId)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId);

    // 2. Remove the floor
    const { error } = await db
      .from("restaurant_floors")
      .delete()
      .eq("id", floorId)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Floor deleted successfully" });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
