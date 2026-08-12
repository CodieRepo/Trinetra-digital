import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { authenticateStaffRequest } from "@/lib/auth/staff-api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { context: staff, errorResponse } = await authenticateStaffRequest(request, body, body.restaurant_id || null);
    if (errorResponse || !staff) {
      return NextResponse.json({ error: errorResponse?.message || "Unauthorized" }, { status: errorResponse?.status || 401 });
    }

    const { session_id } = body || {};
    if (!session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch session
    const { data: session, error: sessionErr } = await db
      .from("restaurant_table_sessions")
      .select("id, tenant_id, restaurant_id, status, payment_status")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Cross-tenant & cross-restaurant check
    if (session.tenant_id !== staff.tenant_id || session.restaurant_id !== staff.restaurant_id) {
      return NextResponse.json({ error: "Forbidden: Session belongs to a different restaurant branch" }, { status: 403 });
    }

    if (session.status === "closed") {
      return NextResponse.json({ success: true, message: "Session is already closed", status: "closed" });
    }

    // Kitchen staff cannot close table sessions
    if (staff.role === "kitchen") {
      return NextResponse.json({ error: "Forbidden: Kitchen staff cannot close table sessions" }, { status: 403 });
    }

    // Check if session payment is paid (unless manager/owner bypass)
    if (session.payment_status !== "paid" && staff.role !== "manager" && staff.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Cannot close session with unpaid balance. Payment required first." },
        { status: 400 }
      );
    }

    // Check all session orders are terminal (served, closed, or cancelled)
    const { data: orders, error: ordersErr } = await db
      .from("restaurant_orders")
      .select("id, status")
      .eq("table_session_id", session_id);

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    const activeOrders = (orders || []).filter((o) => !["served", "closed", "cancelled"].includes(o.status));
    if (activeOrders.length > 0 && staff.role !== "manager" && staff.role !== "owner") {
      return NextResponse.json(
        { error: `Forbidden: Cannot close session while ${activeOrders.length} order(s) are still active.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Close session
    const { error: updateErr } = await db
      .from("restaurant_table_sessions")
      .update({
        status: "closed",
        closed_at: now,
      })
      .eq("id", session_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      status: "closed",
      closed_at: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
