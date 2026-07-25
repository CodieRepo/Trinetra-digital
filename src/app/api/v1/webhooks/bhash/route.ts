import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../../lib/security/rateLimiter";
import { bhashProvider } from "../../../../../services/providers/bhashProvider";
import { leadIngestionService } from "../../../../../services/leadIngestionService";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  return new Response(challenge || "BhashSMS Webhook Endpoint Active", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const db = getSupabaseAdmin();
  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "webhook-client";

  const rateLimit = checkRateLimit(clientIp, 120, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let rawBody = "";
  let jsonBody: any = {};

  try {
    rawBody = await request.text();
    if (rawBody) {
      try {
        jsonBody = JSON.parse(rawBody);
      } catch {
        const searchParams = new URLSearchParams(rawBody);
        jsonBody = {};
        searchParams.forEach((value, key) => {
          jsonBody[key] = value;
        });
      }
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload body" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => {
    if (!jsonBody[key]) {
      jsonBody[key] = value;
    }
  });

  const payload = bhashProvider.parseWebhookPayload(jsonBody);
  if (!payload) {
    return NextResponse.json({ error: "Missing required phone number field" }, { status: 400 });
  }

  // Webhook Idempotency Check
  const idempotencyKey = payload.meta_message_id || `bhash-${payload.phone}-${payload.flow_node}-${payload.timestamp}`;
  try {
    const { data: existingLog } = await db
      .from("webhook_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      console.log(`ℹ️ Duplicate webhook ignored: ${idempotencyKey}`);
      return NextResponse.json({ success: true, message: "Duplicate event ignored" }, { status: 200 });
    }
  } catch (e) {}

  try {
    const result = await leadIngestionService.processInboundMessage(payload);
    const duration = Date.now() - startTime;

    // Record idempotency log
    try {
      await db.from("webhook_logs").insert({
        tenant_id: payload.tenant_id,
        idempotency_key: idempotencyKey,
        provider: "bhash",
        payload: jsonBody,
        status: "processed",
      });
    } catch (e) {}

    console.log(`⚡ [Webhook Processed in ${duration}ms] Lead ID: ${result.lead.id}`);

    return NextResponse.json({
      success: true,
      leadId: result.lead.id,
      isNewLead: result.isNewLead,
      processedInMs: duration,
    }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook Ingestion Error:", err);
    try {
      await db.from("webhook_logs").insert({
        tenant_id: payload.tenant_id,
        idempotency_key: idempotencyKey,
        provider: "bhash",
        payload: jsonBody,
        status: "failed",
        error_message: err.message,
      });
    } catch (e) {}

    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
