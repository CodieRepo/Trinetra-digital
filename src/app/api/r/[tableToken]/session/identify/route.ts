import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;

    if (!tableToken) {
      return NextResponse.json({ error: "tableToken is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { session_token, table_session_id, customer_name, customer_phone } = body;

    if (!session_token) {
      return NextResponse.json({ error: "session_token is required" }, { status: 400 });
    }

    let cleanName: string | null = null;
    let cleanPhone: string | null = null;

    if (customer_name && typeof customer_name === "string") {
      const trimmed = customer_name.trim();
      if (trimmed.length > 0 && trimmed.length < 2) {
        return NextResponse.json({ error: "Customer name must be at least 2 characters" }, { status: 400 });
      }
      if (trimmed.length > 100) {
        return NextResponse.json({ error: "Customer name cannot exceed 100 characters" }, { status: 400 });
      }
      cleanName = trimmed || null;
    }

    if (customer_phone && typeof customer_phone === "string") {
      const digitsOnly = customer_phone.replace(/\D/g, "");
      if (digitsOnly.length > 0 && (digitsOnly.length < 10 || digitsOnly.length > 15)) {
        return NextResponse.json({ error: "Phone number must be between 10 and 15 digits" }, { status: 400 });
      }
      cleanPhone = digitsOnly || null;
    }

    const supabase = getSupabaseAdmin();

    // Validate table
    const { data: table, error: tableErr } = await supabase
      .from("restaurant_tables")
      .select("id, tenant_id, restaurant_id, is_active")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    // Search active session
    let existingQuery = supabase
      .from("restaurant_table_sessions")
      .select("id")
      .eq("table_id", table.id)
      .eq("session_token", session_token)
      .eq("status", "active");

    if (table_session_id) {
      existingQuery = existingQuery.eq("id", table_session_id);
    }

    const { data: existingSession } = await existingQuery
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let targetSessionId = existingSession?.id;

    if (targetSessionId) {
      const { error: updateErr } = await supabase
        .from("restaurant_table_sessions")
        .update({
          customer_name: cleanName,
          customer_phone: cleanPhone,
        })
        .eq("id", targetSessionId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      // Insert new session
      const { data: newSession, error: createErr } = await supabase
        .from("restaurant_table_sessions")
        .insert({
          tenant_id: table.tenant_id,
          restaurant_id: table.restaurant_id,
          table_id: table.id,
          session_token: session_token,
          customer_name: cleanName,
          customer_phone: cleanPhone,
          status: "active",
          payment_status: "unpaid",
        })
        .select("id")
        .single();

      if (createErr || !newSession) {
        return NextResponse.json({ error: createErr?.message || "Failed to create session" }, { status: 500 });
      }
      targetSessionId = newSession.id;
    }

    return NextResponse.json({ success: true, session_id: targetSessionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
