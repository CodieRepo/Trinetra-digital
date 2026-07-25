import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/rateLimit";
import { isUuid, normalizePhone } from "../types";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";

export const dynamic = "force-dynamic";

/**
 * POST /api/r/{table_token}/session/identify
 *
 * Sets customer identity (name + phone) on the active table session.
 *
 * Body: { session_token: string, table_session_id?: string, customer_name: string, customer_phone: string }
 *
 * Returns { success: true, session_id: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ table_token: string }> },
) {
  try {
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`session_identify:${ip}`, 10, 10);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfter).response;
    }

    const { table_token: tableToken } = await params;
    const body = await request.json();
    const sessionToken =
      typeof body?.session_token === "string" ? body.session_token.trim() : "";
    const clientTableSessionId =
      typeof body?.table_session_id === "string"
        ? body.table_session_id.trim()
        : "";
    const customerName =
      typeof body?.customer_name === "string" ? body.customer_name.trim() : "";
    const customerPhone =
      typeof body?.customer_phone === "string"
        ? normalizePhone(body.customer_phone)
        : "";

    if (!tableToken) {
      return NextResponse.json(
        { error: "Missing table token" },
        { status: 400 },
      );
    }

    if (!isUuid(sessionToken)) {
      return NextResponse.json(
        { error: "Invalid session_token" },
        { status: 400 },
      );
    }

    if (!customerName || customerName.length < 2) {
      return NextResponse.json(
        { error: "Customer name is required (min 2 characters)" },
        { status: 400 },
      );
    }

    if (!customerPhone || customerPhone.length < 10) {
      return NextResponse.json(
        { error: "Valid phone number is required (min 10 digits)" },
        { status: 400 },
      );
    }

    const getDatabaseClient() = getSupabaseAdmin();

    // Resolve table
    const { data: table, error: tableError } = await getDatabaseClient()
      .from("restaurant_tables")
      .select("id, restaurant_id")
      .eq("table_token", tableToken)
      .maybeSingle<{ id: string; restaurant_id: string }>();

    if (tableError) throw new Error(tableError.message);
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // --- Find session (same cascade as orders API) ---
    let sessionId: string | null = null;

    // 1. By explicit table_session_id
    if (clientTableSessionId && isUuid(clientTableSessionId)) {
      const { data: s } = await getDatabaseClient()
        .from("restaurant_table_sessions")
        .select("id")
        .eq("id", clientTableSessionId)
        .eq("table_id", table.id)
        .eq("session_token", sessionToken)
        .eq("status", "active")
        .maybeSingle<{ id: string }>();
      if (s) sessionId = s.id;
    }

    // 2. By session_token + table
    if (!sessionId) {
      const { data: s } = await getDatabaseClient()
        .from("restaurant_table_sessions")
        .select("id")
        .eq("table_id", table.id)
        .eq("session_token", sessionToken)
        .eq("status", "active")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (s) sessionId = s.id;
    }

    // 3. No active session — create one with identity pre-set
    if (!sessionId) {
      const { data: newSession, error: createError } = await getDatabaseClient()
        .from("restaurant_table_sessions")
        .insert({
          restaurant_id: table.restaurant_id,
          table_id: table.id,
          session_token: sessionToken,
          status: "active",
          customer_name: customerName,
          customer_phone: customerPhone,
        })
        .select("id")
        .single<{ id: string }>();

      if (createError || !newSession) {
        throw new Error(
          createError?.message || "Failed to create table session",
        );
      }

      return NextResponse.json({
        success: true,
        session_id: newSession.id,
      });
    }

    // Update existing session with identity
    const { error: updateError } = await getDatabaseClient()
      .from("restaurant_table_sessions")
      .update({
        customer_name: customerName,
        customer_phone: customerPhone,
      })
      .eq("id", sessionId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ success: true, session_id: sessionId });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
