import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "served",
  "closed",
  "cancelled",
];

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

    const { status } = body || {};

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    // Fetch current order
    const { data: order, error: orderErr } = await db
      .from("restaurant_orders")
      .select("id, tenant_id, restaurant_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.restaurant_id !== staff.restaurant_id) {
      return NextResponse.json({ error: "Forbidden: Order belongs to a different restaurant" }, { status: 403 });
    }

    // Role-based status transition restrictions
    if (staff.role === "kitchen" && (status === "served" || status === "closed")) {
      return NextResponse.json(
        { error: "Forbidden: Kitchen role cannot mark orders as served or closed" },
        { status: 403 }
      );
    }
    if (staff.role === "waiter" && (status === "accepted" || status === "preparing")) {
      return NextResponse.json(
        { error: "Forbidden: Waiter role cannot transition orders to accepted or preparing" },
        { status: 403 }
      );
    }

    const from_status = order.status;
    const now = new Date().toISOString();

    // Update order status
    const { error: updateErr } = await db
      .from("restaurant_orders")
      .update({ status, updated_at: now })
      .eq("id", orderId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Insert audit trail event
    const { error: eventErr } = await db
      .from("restaurant_order_events")
      .insert({
        tenant_id: order.tenant_id || staff.tenant_id,
        order_id: order.id,
        from_status: from_status,
        to_status: status,
        actor_role: staff.role,
        actor_id: staff.id,
      });

    if (eventErr) {
      console.error("Failed to insert order event audit row:", eventErr.message);
    }

    return NextResponse.json({ success: true, status });
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
