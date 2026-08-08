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

    // Query table info
    const { data: table } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Touch table_session updated_at to trigger realtime notification for staff
    const nowIso = new Date().toISOString();
    await supabase
      .from("restaurant_table_sessions")
      .update({
        updated_at: nowIso,
      })
      .eq("id", sessionId);

    return NextResponse.json({
      success: true,
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
