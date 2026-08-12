import { NextResponse } from "next/server";
import { isUuid } from "../types";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";
import { verifyStaffToken, extractBearerToken } from "../../services/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/staff/sessions/payment
 *
 * Mark a session as paid or undo the paid state.
 *
 * Body: {
 *   access_token: string,
 *   session_id: string,
 *   action: "mark_paid" | "undo_paid"
 * }
 */
export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request);
    const body = await request.json();
    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";

    if (!isUuid(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session_id" },
        { status: 400 },
      );
    }

    if (action !== "mark_paid" && action !== "undo_paid") {
      return NextResponse.json(
        { error: "Invalid action. Use mark_paid or undo_paid." },
        { status: 400 },
      );
    }

    const verifiedStaff = await verifyStaffToken(accessToken);
    if (!verifiedStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (verifiedStaff.role === "kitchen") {
      return NextResponse.json(
        { error: "Kitchen staff cannot modify payment status" },
        { status: 403 },
      );
    }

    const db = getDatabaseClient();

    // Load session
    const { data: session, error: sessionError } = await db
      .from("restaurant_table_sessions")
      .select("id, restaurant_id, status, payment_status")
      .eq("id", sessionId)
      .maybeSingle<{
        id: string;
        restaurant_id: string;
        status: string;
        payment_status: string;
      }>();

    if (sessionError) throw new Error(sessionError.message);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.restaurant_id !== verifiedStaff.restaurant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.status === "closed") {
      return NextResponse.json(
        { error: "Cannot change payment on a closed session" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    if (action === "mark_paid") {
      if (session.payment_status === "paid") {
        return NextResponse.json(
          { error: "Session is already marked as paid" },
          { status: 400 },
        );
      }

      const { error: updateError } = await db
        .from("restaurant_table_sessions")
        .update({
          payment_status: "paid",
          paid_at: now,
          paid_by: verifiedStaff.staff_id,
        })
        .eq("id", sessionId);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        success: true,
        session_id: sessionId,
        payment_status: "paid",
        paid_at: now,
      });
    }

    // undo_paid
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Session is not marked as paid" },
        { status: 400 },
      );
    }

    const { error: updateError } = await db
      .from("restaurant_table_sessions")
      .update({
        payment_status: "unpaid",
        paid_at: null,
        paid_by: null,
      })
      .eq("id", sessionId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      payment_status: "unpaid",
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
