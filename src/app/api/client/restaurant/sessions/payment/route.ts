import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId } = await resolveRestaurantContext(request, body);
    const { session_id, action } = body;

    if (!session_id || !action) {
      return NextResponse.json({ error: "session_id and action required" }, { status: 400 });
    }

    if (action === "mark_paid") {
      const { error } = await db
        .from("restaurant_table_sessions")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", session_id)
        .eq("tenant_id", tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "undo_paid") {
      const { error } = await db
        .from("restaurant_table_sessions")
        .update({ payment_status: "unpaid", paid_at: null })
        .eq("id", session_id)
        .eq("tenant_id", tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
