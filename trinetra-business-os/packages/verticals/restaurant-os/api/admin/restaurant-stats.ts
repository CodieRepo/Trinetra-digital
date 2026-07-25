import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@trinetra/core/database";
import { verifyAdmin } from "@trinetra/core/auth";
import { isUuid } from "../types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin();

    const clientId = request.nextUrl.searchParams.get("client_id");
    if (!clientId || !isUuid(clientId)) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, name, setup_status")
      .eq("client_id", clientId)
      .maybeSingle();

    if (restErr) {
      return NextResponse.json({ error: restErr.message }, { status: 500 });
    }

    if (!restaurant) {
      return NextResponse.json({ restaurant_name: null });
    }

    // Fetch counts in parallel
    const [
      { count: tablesCount },
      { count: staffCount },
      { count: activeOrders },
    ] = await Promise.all([
      supabase
        .from("restaurant_tables")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("restaurant_staff")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("restaurant_orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .in("status", ["placed", "accepted", "preparing", "ready"]),
    ]);

    return NextResponse.json({
      restaurant_name: restaurant.name,
      setup_status: restaurant.setup_status,
      tables_count: tablesCount ?? 0,
      staff_count: staffCount ?? 0,
      active_orders: activeOrders ?? 0,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
