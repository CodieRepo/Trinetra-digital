import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;
    const body = await request.json();
    const { sessionId } = body;

    if (!tableToken || !sessionId) {
      return NextResponse.json(
        { error: "tableToken and sessionId are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Query table info to ensure valid table context
    const { data: table } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, tenant_id, table_number")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Verify session exists, is active, and matches table
    const { data: session, error: sessionErr } = await supabase
      .from("restaurant_table_sessions")
      .select("id, status, payment_status, bill_requested_at, table_id, restaurant_id, tenant_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.table_id !== table.id || session.restaurant_id !== table.restaurant_id) {
      return NextResponse.json({ error: "Forbidden: Session does not belong to this table" }, { status: 403 });
    }

    if (session.status === "closed") {
      return NextResponse.json({ error: "Session is already closed" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // Idempotency: If already requested and not paid, return existing state
    if (session.bill_requested_at || session.payment_status === "requested") {
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
        message: `Bill request already sent for Table ${table.table_number}!`,
        details: {
          table_number: table.table_number,
          requested_at: session.bill_requested_at || nowIso,
        },
      });
    }

    // Update restaurant_table_sessions with bill_requested_at and payment_status
    const updatePayload: Record<string, any> = {
      bill_requested_at: nowIso,
      updated_at: nowIso,
    };

    if (session.payment_status !== "paid") {
      updatePayload.payment_status = "requested";
    }

    const { error: updateErr } = await supabase
      .from("restaurant_table_sessions")
      .update(updatePayload)
      .eq("id", sessionId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alreadyRequested: false,
      message: `Bill request sent for Table ${table.table_number}!`,
      details: {
        table_number: table.table_number,
        requested_at: nowIso,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
