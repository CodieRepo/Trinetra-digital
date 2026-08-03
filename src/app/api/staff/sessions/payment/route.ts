import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStaffToken(request: Request, body?: any): string {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  const xToken = request.headers.get("x-staff-token");
  if (xToken && xToken.trim()) return xToken.trim();
  if (body && body.token && typeof body.token === "string") return body.token.trim();
  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get("token");
    if (qToken && qToken.trim()) return qToken.trim();
  } catch (e) {}
  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = getStaffToken(request, body);
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

    // Enforce role-based discount permissions
    if (staff.role === "kitchen") {
      return NextResponse.json({ error: "Forbidden: Kitchen staff cannot process payment" }, { status: 403 });
    }

    if (staff.role === "waiter") {
      if (type === "flat" && value > 0) {
        return NextResponse.json({ error: "Forbidden: Waiter role is not allowed to apply flat discounts" }, { status: 403 });
      }
      if (type === "percentage" && value > 5) {
        return NextResponse.json({ error: "Forbidden: Waiter discount percentage cannot exceed 5%" }, { status: 403 });
      }
    } else {
      if (type === "percentage" && value > 20) {
        return NextResponse.json({ error: "Forbidden: Discount percentage cannot exceed 20%" }, { status: 403 });
      }
      if (type === "flat" && value > subtotal * 0.20) {
        return NextResponse.json({ error: "Forbidden: Flat discount cannot exceed 20% of subtotal" }, { status: 403 });
      }
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
