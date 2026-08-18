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
    if (!restaurantId) return NextResponse.json({ tables: [] });

    const { data, error } = await db
      .from("restaurant_tables")
      .select("id, table_number, table_token, floor_id, is_active, created_at, restaurant_floors ( id, name )")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("table_number", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Flatten the floor join into floor_name for client convenience
    const tables = (data || []).map((t: any) => ({
      ...t,
      floor_name: t.restaurant_floors?.name || null,
      restaurant_floors: undefined,
    }));
    return NextResponse.json({ tables });
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

    // Validate floor_id belongs to the same restaurant/tenant if provided
    const floorId = body.floor_id || null;
    if (floorId) {
      const { data: floor } = await db
        .from("restaurant_floors")
        .select("id")
        .eq("id", floorId)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!floor) {
        return NextResponse.json({ error: "Invalid floor for this restaurant" }, { status: 400 });
      }
    }

    const { data, error } = await db
      .from("restaurant_tables")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        table_number: body.table_number,
        floor_id: floorId,
      })
      .select("id, table_number, table_token, floor_id, is_active, created_at, restaurant_floors ( id, name )")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const table = data ? { ...data, floor_name: (data as any).restaurant_floors?.name || null, restaurant_floors: undefined } : null;
    return NextResponse.json({ table });
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
    const { tenantId, restaurantId } = await requireStaffRole(request, ["owner", "manager"], body);
    const tableId = body.table_id;
    const floorId = body.floor_id ?? null;

    if (!tableId) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    // Validate floor_id belongs to the same restaurant/tenant if provided
    if (floorId) {
      const { data: floor } = await db
        .from("restaurant_floors")
        .select("id")
        .eq("id", floorId)
        .eq("tenant_id", tenantId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!floor) {
        return NextResponse.json({ error: "Invalid floor for this restaurant" }, { status: 400 });
      }
    }

    const { data, error } = await db
      .from("restaurant_tables")
      .update({ floor_id: floorId })
      .eq("id", tableId)
      .eq("tenant_id", tenantId)
      .select("id, table_number, table_token, floor_id, is_active, created_at, restaurant_floors ( id, name )")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const table = data ? { ...data, floor_name: (data as any).restaurant_floors?.name || null, restaurant_floors: undefined } : null;
    return NextResponse.json({ table });
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
    const tableId = body.table_id;

    if (!tableId) {
      return NextResponse.json({ error: "table_id is required" }, { status: 400 });
    }

    // Check if table has any historical operational data
    const { data: linkedOrders } = await db
      .from("restaurant_orders")
      .select("id")
      .eq("table_id", tableId)
      .eq("tenant_id", tenantId)
      .limit(1);

    const { data: linkedSessions } = await db
      .from("restaurant_table_sessions")
      .select("id")
      .eq("table_id", tableId)
      .eq("tenant_id", tenantId)
      .limit(1);

    const hasHistoricalData = (linkedOrders && linkedOrders.length > 0) || (linkedSessions && linkedSessions.length > 0);

    if (hasHistoricalData) {
      // Soft archive: preserve table record but mark inactive
      const { error } = await db
        .from("restaurant_tables")
        .update({ is_active: false })
        .eq("id", tableId)
        .eq("tenant_id", tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, archived: true, message: "Table archived — historical data preserved." });
    } else {
      // No historical data: safe to hard delete
      const { error } = await db
        .from("restaurant_tables")
        .delete()
        .eq("id", tableId)
        .eq("tenant_id", tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, archived: false });
    }
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
