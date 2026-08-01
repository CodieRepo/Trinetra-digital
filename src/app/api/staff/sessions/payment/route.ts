import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing Bearer token" }, { status: 401 });
    }

    const db = getSupabaseAdmin();
    const { data: staff, error: staffErr } = await db
      .from("restaurant_staff")
      .select("id, tenant_id, restaurant_id, name, role, is_active")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (staffErr || !staff) {
      return NextResponse.json({ error: "Unauthorized: Invalid or inactive staff token" }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, discount_type, discount_value, discount_reason } = body || {};

    if (!session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    // Fetch session
    const { data: session, error: sessionErr } = await db
      .from("restaurant_table_sessions")
      .select("id, tenant_id, restaurant_id, status, payment_status")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.restaurant_id !== staff.restaurant_id) {
      return NextResponse.json({ error: "Forbidden: Session belongs to a different restaurant" }, { status: 403 });
    }

    // Fetch all orders for session
    const { data: orders, error: ordersErr } = await db
      .from("restaurant_orders")
      .select("id, status, total_amount")
      .eq("table_session_id", session_id);

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    // Compute subtotal sum of order amounts (excluding cancelled orders)
    const validOrders = (orders || []).filter((o) => o.status !== "cancelled");
    const subtotal = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    // Calculate discount_amount
    const type = discount_type || "none";
    const value = Number(discount_value) || 0;
    let discountAmount = 0;

    if (type === "percentage") {
      discountAmount = (subtotal * value) / 100;
    } else if (type === "flat") {
      discountAmount = value;
    }

    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
    const grandTotal = Math.max(0, subtotal - discountAmount);

    // Inserts/upserts restaurant_bills record
    const { error: billErr } = await db
      .from("restaurant_bills")
      .upsert({
        tenant_id: session.tenant_id || staff.tenant_id,
        restaurant_id: session.restaurant_id || staff.restaurant_id,
        session_id: session.id,
        subtotal: subtotal,
        discount_type: type,
        discount_value: value,
        discount_amount: discountAmount,
        discount_reason: discount_reason || null,
        grand_total: grandTotal,
      }, { onConflict: "session_id" });

    if (billErr) {
      return NextResponse.json({ error: billErr.message }, { status: 500 });
    }

    // If discount applied (>0), insert audit row in restaurant_discount_audit
    if (discountAmount > 0) {
      const { error: auditErr } = await db
        .from("restaurant_discount_audit")
        .insert({
          tenant_id: session.tenant_id || staff.tenant_id,
          restaurant_id: session.restaurant_id || staff.restaurant_id,
          session_id: session.id,
          actor_id: staff.id,
          actor_role: staff.role,
          before_amount: subtotal,
          after_amount: grandTotal,
          discount_type: type === "flat" ? "flat" : "percentage",
          discount_value: value,
          discount_amount: discountAmount,
          reason: discount_reason || "Staff discount",
        });

      if (auditErr) {
        console.error("restaurant_discount_audit insert note:", auditErr.message);
      }
    }

    const now = new Date().toISOString();

    // Update restaurant_table_sessions
    const { error: updateSessionErr } = await db
      .from("restaurant_table_sessions")
      .update({
        payment_status: "paid",
        paid_at: now,
      })
      .eq("id", session_id);

    if (updateSessionErr) {
      return NextResponse.json({ error: updateSessionErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      grand_total: grandTotal,
      payment_status: "paid",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
