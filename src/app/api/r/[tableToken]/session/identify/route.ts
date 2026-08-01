import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key";

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

    const supabase = getSupabase();

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
          customer_name: customer_name ?? null,
          customer_phone: customer_phone ?? null,
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
          customer_name: customer_name ?? null,
          customer_phone: customer_phone ?? null,
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
