import { NextResponse } from "next/server";
import {
  canStaffTransitionOrder,
  isUuid,
  type RestaurantOrderStatus,
} from "../types";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";
import { verifyStaffToken, extractBearerToken } from "../../services/auth";

export const dynamic = "force-dynamic";

type OrderRecord = {
  id: string;
  restaurant_id: string;
  status: RestaurantOrderStatus;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    const { order_id: orderId } = await params;
    const accessToken = extractBearerToken(request);
    const body = await request.json();
    const nextStatus =
      typeof body?.status === "string"
        ? (body.status.trim() as RestaurantOrderStatus)
        : "";

    if (!orderId || !isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    if (!nextStatus) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 },
      );
    }

    const verifiedStaff = await verifyStaffToken(accessToken);
    if (!verifiedStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const getDatabaseClient() = getSupabaseAdmin();
    const { data: order, error: orderError } = await getDatabaseClient()
      .from("restaurant_orders")
      .select("id, restaurant_id, status")
      .eq("id", orderId)
      .maybeSingle<OrderRecord>();

    if (orderError) {
      throw new Error(orderError.message);
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.restaurant_id !== verifiedStaff.restaurant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      !canStaffTransitionOrder(verifiedStaff.role, order.status, nextStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid status transition" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const [{ error: updateError }, { error: eventError }] = await Promise.all([
      getDatabaseClient()
        .from("restaurant_orders")
        .update({ status: nextStatus, updated_at: now })
        .eq("id", order.id),
      getDatabaseClient().from("restaurant_order_events").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: nextStatus,
        actor_role: verifiedStaff.role,
        actor_id: verifiedStaff.staff_id,
      }),
    ]);

    if (updateError || eventError) {
      throw new Error(
        updateError?.message || eventError?.message || "Failed to update order",
      );
    }

    return NextResponse.json({ success: true, new_status: nextStatus });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
