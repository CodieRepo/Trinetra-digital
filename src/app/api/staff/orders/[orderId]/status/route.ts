import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { authenticateStaffRequest } from "@/lib/auth/staff-api-auth";
import { canStaffTransitionOrder, RestaurantOrderStatus } from "../../../../../../../trinetra-business-os/packages/verticals/restaurant-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: RestaurantOrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "served",
  "closed",
  "cancelled",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    let targetRestaurantHint = body?.restaurant_id || url.searchParams.get("restaurant_id");

    if (!targetRestaurantHint) {
      const { data: ordHint } = await getSupabaseAdmin()
        .from("restaurant_orders")
        .select("restaurant_id")
        .eq("id", orderId)
        .maybeSingle();
      if (ordHint?.restaurant_id) {
        targetRestaurantHint = ordHint.restaurant_id;
      }
    }

    const { context: staff, errorResponse } = await authenticateStaffRequest(request, body, targetRestaurantHint || null);
    if (errorResponse || !staff) {
      return NextResponse.json({ error: errorResponse?.message || "Unauthorized" }, { status: errorResponse?.status || 401 });
    }

    const { status } = body || {};
    if (!status || !VALID_STATUSES.includes(status as RestaurantOrderStatus)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch current order
    const { data: order, error: orderErr } = await db
      .from("restaurant_orders")
      .select("id, tenant_id, restaurant_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Cross-tenant & cross-restaurant check
    if (order.tenant_id !== staff.tenant_id || order.restaurant_id !== staff.restaurant_id) {
      return NextResponse.json(
        { error: "Forbidden: Order belongs to a different tenant or restaurant branch" },
        { status: 403 }
      );
    }

    const from_status = order.status as RestaurantOrderStatus;
    const targetStatus = status as RestaurantOrderStatus;

    // Execute role-based transition check
    const isAllowed = canStaffTransitionOrder(staff.role, from_status, targetStatus);
    if (!isAllowed && !["owner", "manager", "admin", "client_admin", "super_admin"].includes(staff.role)) {
      return NextResponse.json(
        { error: `Forbidden: ${staff.role} role cannot transition order from ${from_status} to ${targetStatus}` },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // 1. Direct authoritative update using Supabase admin
    const { error: updateErr } = await db
      .from("restaurant_orders")
      .update({ status: targetStatus, updated_at: now })
      .eq("id", orderId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 2. Record audit event in restaurant_order_events
    try {
      await db.from("restaurant_order_events").insert({
        tenant_id: staff.tenant_id,
        order_id: order.id,
        from_status: from_status,
        to_status: targetStatus,
        actor_role: staff.role,
        actor_id: staff.staff_id,
      });
    } catch (auditErr) {
      console.warn("[OrderStatus] Non-fatal audit log notice:", auditErr);
    }

    // 3. Attempt atomic notification outbox insertion if RPC exists
    try {
      await db.rpc("transition_order_status_atomic_rpc", {
        p_order_id: order.id,
        p_next_status: targetStatus,
        p_actor_staff_id: staff.staff_id,
        p_actor_role: staff.role,
      });
    } catch {}

    return NextResponse.json({ success: true, status: targetStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  return POST(request, context);
}
