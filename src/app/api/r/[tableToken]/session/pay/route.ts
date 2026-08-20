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
    const { sessionId, paymentMethod, utrNumber, amount, tipAmount } = body;

    if (!tableToken || !sessionId) {
      return NextResponse.json({ error: "tableToken and sessionId are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Query table info
    const { data: table } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const tipNote = tipAmount && Number(tipAmount) > 0 ? ` (+ ₹${tipAmount} Tip)` : "";
    const noteText = `Customer Payment Request (${paymentMethod?.toUpperCase() || "ONLINE"})${tipNote}${utrNumber ? ` - UTR: ${utrNumber}` : ""}`;

    // Verify session belongs to this specific table
    const { data: sessionRecord } = await supabase
      .from("restaurant_table_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("table_id", table.id)
      .eq("restaurant_id", table.restaurant_id)
      .maybeSingle();

    if (!sessionRecord) {
      return NextResponse.json({ error: "Session not found for this table" }, { status: 404 });
    }

    await supabase
      .from("restaurant_table_sessions")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("table_id", table.id)
      .eq("restaurant_id", table.restaurant_id);

    return NextResponse.json({
      success: true,
      message: "Payment confirmation notification sent to cashier successfully!",
      details: {
        table_number: table.table_number,
        amount,
        tipAmount: tipAmount || 0,
        paymentMethod,
        utrNumber,
        noteText,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
