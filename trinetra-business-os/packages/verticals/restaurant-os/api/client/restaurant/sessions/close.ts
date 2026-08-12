import { NextResponse } from "next/server";
import { isUuid, isTerminalOrderStatus } from "../types";
import type { RestaurantOrderStatus } from "../types";
import {
  getApiErrorStatus,
  getErrorMessage,
  requireRestaurantClientContext,
} from "../../services/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/restaurant/sessions/close
 *
 * Close a table session. Authenticated via Supabase client auth (restaurant owner).
 *
 * Body: { session_id: string, force?: boolean }
 *
 * Safe close: all orders terminal → mark session closed.
 * Force close: active orders exist + force=true → cancel active orders, then close.
 */
export async function POST(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const body = await request.json();

    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";
    const force = body?.force === true;

    if (!isUuid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session_id" },
        { status: 400 },
      );
    }

    const db = getDatabaseClient();

    // 1. Load session
    const { data: session, error: sessionError } = await db
      .from("restaurant_table_sessions")
      .select("id, restaurant_id, status")
      .eq("id", sessionId)
      .maybeSingle<{ id: string; restaurant_id: string; status: string }>();

    if (sessionError) throw new Error(sessionError.message);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.restaurant_id !== context.restaurant.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.status === "closed") {
      return NextResponse.json(
        { error: "Session is already closed" },
        { status: 400 },
      );
    }

    // 2. Check orders in this session
    const { data: orders, error: ordersError } = await db
      .from("restaurant_orders")
      .select("id, status")
      .eq("table_session_id", sessionId)
      .returns<{ id: string; status: string }[]>();

    if (ordersError) throw new Error(ordersError.message);

    const activeOrders = (orders ?? []).filter(
      (o) => !isTerminalOrderStatus(o.status),
    );

    // 3. Require force when active orders exist
    if (activeOrders.length > 0 && !force) {
      return NextResponse.json(
        {
          error: "Session has active orders. Use force close to cancel them.",
          active_order_count: activeOrders.length,
          requires_force: true,
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    // 4. Force-close: cancel active orders with audit trail
    if (activeOrders.length > 0) {
      const cancelOps = activeOrders.map((o) =>
        Promise.all([
          db
            .from("restaurant_orders")
            .update({
              status: "cancelled" as RestaurantOrderStatus,
              updated_at: now,
            })
            .eq("id", o.id),
          db.from("restaurant_order_events").insert({
            order_id: o.id,
            from_status: o.status,
            to_status: "cancelled",
            actor_role: "owner",
            actor_id: context.user.id,
          }),
        ]),
      );
      await Promise.all(cancelOps);
    }

    // 5. Close the session
    const { error: closeError } = await db
      .from("restaurant_table_sessions")
      .update({ status: "closed", closed_at: now })
      .eq("id", sessionId);

    if (closeError) throw new Error(closeError.message);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      status: "closed",
      cancelled_orders: activeOrders.length,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: getApiErrorStatus(message) },
    );
  }
}
