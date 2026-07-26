import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { session_id, force } = body;

    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    // Check if there are non-terminal orders
    if (!force) {
      const { data: activeOrders } = await db
        .from("restaurant_orders")
        .select("id, status")
        .eq("table_session_id", session_id)
        .eq("tenant_id", TENANT_ID)
        .not("status", "in", '("closed","cancelled","served")');

      if (activeOrders && activeOrders.length > 0) {
        return NextResponse.json(
          { error: "Session has active orders", requires_force: true },
          { status: 409 }
        );
      }
    }

    const { error } = await db
      .from("restaurant_table_sessions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", session_id)
      .eq("tenant_id", TENANT_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
