import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../lib/security/rateLimiter";
import { verifyBhashSignature, validateAndNormalizePayload } from "../../../../lib/bhash/validator";
import { leadService } from "../../../../services/leadService";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET Verification endpoint for BhashSMS Webhook Handshake & Verification
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  const token = searchParams.get("token") || searchParams.get("verify_token") || searchParams.get("hub.verify_token");
  const expectedToken = process.env.BHASHSMS_VERIFY_TOKEN || process.env.WEBHOOK_VERIFY_TOKEN || "trinetra_token";

  console.log(`[Bhash Webhook GET Verification] Received token: "${token}", challenge: "${challenge}"`);

  if (token && token !== expectedToken) {
    console.warn(`[Bhash Webhook GET Verification] Token mismatch! Expected "${expectedToken}", got "${token}"`);
    return new Response("Forbidden: Verify Token Mismatch", { status: 403 });
  }

  return new Response(challenge || "BhashSMS Webhook Endpoint Operational & Active", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST /api/webhooks/bhash
 * Incoming Webhook for BhashSMS WhatsApp Flow Events (Nodes 6206 - 6232)
 */
export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "bhash-webhook";
  const contentType = request.headers.get("content-type") || "";

  console.log(`\n=================================================================`);
  console.log(`📩 [Bhash Webhook Received] IP: ${clientIp} | Content-Type: ${contentType}`);

  // 1. Sliding-Window Rate Limiting (100 req/min limit per IP)
  const rateLimit = checkRateLimit(clientIp, 100, 60000);
  if (!rateLimit.allowed) {
    console.warn(`⚠️ [Bhash Webhook] Rate limit exceeded for IP ${clientIp}`);
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let rawBody = "";
  let jsonBody: any = {};

  try {
    rawBody = await request.text();
    console.log(`📥 [Bhash Webhook Raw Body]:`, rawBody);
  } catch (err) {
    console.error("❌ [Bhash Webhook] Error reading body text:", err);
    return NextResponse.json({ error: "Invalid body text" }, { status: 400 });
  }

  // Parse Body (Supports JSON, URL-Encoded Form Data, or Query Params fallback)
  if (rawBody) {
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      // Fallback: Parse URL-Encoded Form Data (e.g. phone=9606916617&node=6206&text=Welcome)
      try {
        const searchParams = new URLSearchParams(rawBody);
        jsonBody = {};
        searchParams.forEach((value, key) => {
          jsonBody[key] = value;
        });
      } catch (formErr) {
        console.warn("[Bhash Webhook] Could not parse body as form data:", formErr);
      }
    }
  }

  // Fallback: Check Query Params if body was empty or missing phone
  const { searchParams } = new URL(request.url);
  if (searchParams.toString() && (!jsonBody.phone && !jsonBody.sender && !jsonBody.mobile && !jsonBody.from)) {
    searchParams.forEach((value, key) => {
      jsonBody[key] = value;
    });
  }

  console.log(`📦 [Bhash Webhook Parsed Payload]:`, JSON.stringify(jsonBody, null, 2));

  // 2. Signature Verification
  const sigHeader = request.headers.get("x-bhash-signature") || request.headers.get("x-signature");
  if (!verifyBhashSignature(rawBody, sigHeader)) {
    console.warn("⚠️ [Bhash Webhook] Signature verification failed.");
    return NextResponse.json({ error: "Unauthorized: Invalid Signature" }, { status: 401 });
  }

  // 3. Payload Normalization
  const payload = validateAndNormalizePayload(jsonBody);
  if (!payload) {
    console.error("❌ [Bhash Webhook] Payload validation failed. Required phone field missing:", jsonBody);
    return NextResponse.json({ error: "Invalid payload format: phone field missing" }, { status: 400 });
  }

  // 4. Idempotency & Duplicate Check
  const idempotencyKey = payload.meta_message_id || `bhash-${payload.phone}-${payload.flow_node}-${payload.timestamp}`;

  try {
    const { data: existingLog } = await db
      .from("bhash_webhook_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingLog) {
      console.log(`ℹ️ [Bhash Webhook] Duplicate payload skipped. Idempotency Key: ${idempotencyKey}`);
      return NextResponse.json({ success: true, message: "Duplicate event ignored" }, { status: 200 });
    }
  } catch (dbErr) {
    console.error("⚠️ [Bhash Webhook] Error checking idempotency log:", dbErr);
  }

  // 5. Core Processing Pipeline (Lead, Conversation, Timeline, Task Triggers)
  try {
    const result = await leadService.processInboundBhashPayload(payload);

    // Audit Log Entry
    await db.from("bhash_webhook_logs").insert({
      idempotency_key: idempotencyKey,
      source: "bhash",
      payload: jsonBody,
      status: "processed",
    });

    console.log(`✅ [Bhash Webhook Processed Successfully] Lead ID: ${result.lead.id} | Phone: ${payload.phone} | Node: ${payload.flow_node} | Status: ${result.lead.status}`);
    console.log(`=================================================================\n`);

    return NextResponse.json({
      success: true,
      leadId: result.lead.id,
      isNewLead: result.isNewLead,
      currentNode: payload.flow_node,
      leadStatus: result.lead.status,
    });
  } catch (err: any) {
    console.error("❌ [Bhash Webhook Fatal Processing Error]:", err);

    try {
      await db.from("bhash_webhook_logs").insert({
        idempotency_key: idempotencyKey,
        source: "bhash",
        payload: jsonBody,
        status: "failed",
        error_message: err.message || "Internal processing error",
      });
    } catch {}

    return NextResponse.json(
      { error: "Internal processing error", details: err.message },
      { status: 500 }
    );
  }
}
