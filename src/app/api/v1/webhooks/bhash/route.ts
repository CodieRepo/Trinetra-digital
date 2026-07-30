import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../../lib/security/rateLimiter";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { parsePlainTextPayload, generateFingerprint } from "../../../../../utils/bhashHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BhashPayload {
  mobile: string;
  message: string;
  name: string;
  sourceType: string;
}

function extractPayload(request: Request, rawBody = ""): BhashPayload | null {
  const { searchParams } = new URL(request.url);
  
  // 1. Try extracting from query string parameters (GET or POST URL params)
  const fromphone = searchParams.get("fromphone") || searchParams.get("mobile") || searchParams.get("phone");
  const message = searchParams.get("message") || searchParams.get("msg") || searchParams.get("text");
  const fromname = searchParams.get("fromname") || searchParams.get("name");

  if (fromphone && message) {
    return {
      mobile: fromphone.replace(/\D/g, "").slice(-10),
      message: message,
      name: fromname || `Lead (${fromphone.slice(-4)})`,
      sourceType: "QUERY_STRING"
    };
  }

  // 2. Try parsing plain-text body
  if (rawBody && rawBody.trim() !== "") {
    const parsed = parsePlainTextPayload(rawBody);
    if (parsed.mobile && parsed.mobile.length >= 10) {
      return {
        mobile: parsed.mobile.replace(/\D/g, "").slice(-10),
        message: parsed.message,
        name: parsed.name || `Lead (${parsed.mobile.slice(-4)})`,
        sourceType: "PLAIN_TEXT_BODY"
      };
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromphone = searchParams.get("fromphone") || searchParams.get("mobile") || searchParams.get("phone");
  const message = searchParams.get("message") || searchParams.get("msg") || searchParams.get("text");

  // If query string parameters contain WhatsApp message details, process them directly!
  if (fromphone && message) {
    console.log("[Bhash Webhook GET] Processing incoming message via query parameters...");
    return await processWebhookPayload(request, null);
  }

  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  return new Response(challenge || "BhashSMS Webhook Endpoint Active", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "webhook-client";

  // Rate Limiting Check
  const rateLimit = checkRateLimit(clientIp, 120, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Read request body as plain text for POST parser
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch (err) {
    rawBody = "";
  }

  return await processWebhookPayload(request, rawBody);
}

async function processWebhookPayload(request: Request, rawBody: string | null) {
  const db = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);

  // 1. Resolve Tenant ID
  let tenantId = searchParams.get("tenant_id") || searchParams.get("tenant_slug");
  
  if (tenantId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    const { data: tenant } = await db
      .from("tenants")
      .select("id")
      .eq("name", tenantId)
      .maybeSingle();
    if (tenant) {
      tenantId = tenant.id;
    } else {
      tenantId = null;
    }
  }

  if (!tenantId) {
    tenantId = process.env.DEFAULT_TENANT_ID || "00000000-0000-0000-0000-000000000001";
  }

  // 2. Extract and Validate Payload
  const parsed = extractPayload(request, rawBody || "");
  if (!parsed || !parsed.mobile || parsed.mobile.length < 10) {
    console.warn(`[Bhash Webhook] Ignored malformed webhook trigger: "${rawBody || request.url}"`);
    return new Response("Malformed payload ignored", { status: 200 });
  }

  // 3. Fingerprint Deduplication
  const timestamp = new Date().toISOString();
  const idempotencyKey = generateFingerprint(parsed.mobile, parsed.message, timestamp);

  try {
    // Attempt duplicate prevention insert into webhook_logs
    const { error: logErr } = await db
      .from("webhook_logs")
      .insert({
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        provider: "bhash",
        payload: {
          raw: rawBody || `QueryString: ${request.url}`,
          parsed,
          timestamp
        },
        status: "processed",
      });

    if (logErr) {
      // Duplicate violation checks
      if (logErr.code === "23505" || logErr.message?.includes("unique")) {
        console.log(`ℹ️ Duplicate webhook ignored: ${idempotencyKey}`);
        await incrementHealthDuplicates(db, tenantId);
        return new Response("Duplicate event ignored", { status: 200 });
      }
      throw logErr;
    }

    // 4. Enqueue background job to job_queue (Serverless-friendly)
    const { error: jobErr } = await db
      .from("job_queue")
      .insert({
        tenant_id: tenantId,
        job_type: "whatsapp_inbound_message",
        payload: {
          mobile: parsed.mobile,
          message: parsed.message,
          name: parsed.name,
          tenant_id: tenantId,
          meta_message_id: idempotencyKey,
          timestamp,
          source: "WEBHOOK",
          provider: "bhash_api"
        },
        status: "pending",
        run_at: new Date().toISOString()
      });

    if (jobErr) {
      console.error("[Bhash Webhook] Job queuing failed:", jobErr.message);
      await db
        .from("webhook_logs")
        .update({ status: "failed", error_message: jobErr.message })
        .eq("idempotency_key", idempotencyKey);
    } else {
      // 5. Asynchronously trigger the serverless runner (fire-and-forget)
      triggerJobRunnerAsync(tenantId).catch(err => {
        console.error("[Bhash Webhook] Async job trigger exception:", err);
      });
    }

    // Update last incoming telemetry in config
    await updateLastIncomingTelemetry(db, tenantId);

  } catch (err: any) {
    console.error("[Bhash Webhook] Fatal processing error:", err);
  }

  return new Response("OK", { status: 200 });
}

async function triggerJobRunnerAsync(tenantId: string) {
  const host = process.env.NEXT_PUBLIC_APP_URL || "https://trinetradigitalsolution.com";
  const url = `${host}/api/jobs/run?tenant_id=${tenantId}`;
  
  fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  }).catch(() => {
    // Suppress async call exception
  });
}

async function updateLastIncomingTelemetry(db: any, tenantId: string) {
  try {
    const { data: config } = await db
      .from("provider_configs")
      .select("config_json")
      .eq("tenant_id", tenantId)
      .eq("provider_key", "whatsapp_bhash")
      .maybeSingle();

    const configJson = config?.config_json || {};
    const health = configJson.health || {};
    
    health.webhook_status = "connected";
    health.last_incoming_at = new Date().toISOString();
    health.updated_at = new Date().toISOString();
    configJson.health = health;

    await db
      .from("provider_configs")
      .upsert({
        tenant_id: tenantId,
        provider_key: "whatsapp_bhash",
        config_json: configJson,
        updated_at: new Date().toISOString()
      }, { onConflict: "tenant_id,provider_key" });
  } catch (e) {
    console.error("Telemetry update error:", e);
  }
}

async function incrementHealthDuplicates(db: any, tenantId: string) {
  try {
    const { data: config } = await db
      .from("provider_configs")
      .select("config_json")
      .eq("tenant_id", tenantId)
      .eq("provider_key", "whatsapp_bhash")
      .maybeSingle();

    const configJson = config?.config_json || {};
    const health = configJson.health || {};
    
    health.duplicates_prevented_count = (health.duplicates_prevented_count || 0) + 1;
    health.updated_at = new Date().toISOString();
    configJson.health = health;

    await db
      .from("provider_configs")
      .upsert({
        tenant_id: tenantId,
        provider_key: "whatsapp_bhash",
        config_json: configJson,
        updated_at: new Date().toISOString()
      }, { onConflict: "tenant_id,provider_key" });
  } catch (e) {
    console.error("Telemetry duplicate increment error:", e);
  }
}
