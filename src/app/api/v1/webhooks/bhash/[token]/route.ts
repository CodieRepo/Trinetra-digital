import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import { parseBhashPlainTextPayload, generateInternalEventId } from "@/utils/bhashHelper";
import { leadIngestionService } from "@/services/leadIngestionService";
import * as crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Maximum allowable webhook request body size: 64 KB
const MAX_BODY_BYTES = 64 * 1024;

// Global in-flight concurrency lock to guard against simultaneous network race retries
const inFlightLocks = new Map<string, number>();
const LOCK_LEASE_MS = 30000; // 30-second lock lease timeout

function acquireInFlightLock(lockKey: string): boolean {
  const now = Date.now();
  const existingLockTime = inFlightLocks.get(lockKey);
  if (existingLockTime && now - existingLockTime < LOCK_LEASE_MS) {
    return false; // Active lock held
  }
  inFlightLocks.set(lockKey, now);
  return true;
}

function releaseInFlightLock(lockKey: string): void {
  inFlightLocks.delete(lockKey);
}

/**
 * GET: Webhook Endpoint Health Check / Probe
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: config } = await db
    .from("provider_configs")
    .select("id, is_active")
    .eq("provider_key", "whatsapp_bhash")
    .eq("config_json->>webhook_token", token)
    .maybeSingle();

  if (!config) {
    return new Response("Webhook endpoint not found", { status: 404 });
  }
  if (!config.is_active) {
    return new Response("Webhook token suspended", { status: 401 });
  }

  return new Response("BhashSMS Official Webhook Active", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST: Official BhashSMS Real-Time WhatsApp Webhook Handler
 * 
 * Contract:
 * - Content-Type: text/plain
 * - Body: Mobile: 919876543210, Message: Hello from Bhash, Name: Bhash
 * - URL: /api/v1/webhooks/bhash/<token>
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Tenant webhook endpoint not found" },
      { status: 404 }
    );
  }

  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "webhook-client";

  // 1. Rate Limiting Check
  const rateLimit = checkRateLimit(clientIp, 180, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // 2. Request Size Guard: reject if Content-Length exceeds 64KB
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload exceeds maximum allowed size of 64KB" },
      { status: 413 }
    );
  }

  const db = getSupabaseAdmin();

  // 3. Strict Tenant Resolution via Webhook Token
  // Query parameters, tenant headers, and phone numbers are completely ignored for identity resolution.
  const { data: providerConfig, error: configErr } = await db
    .from("provider_configs")
    .select("tenant_id, is_active, config_json")
    .eq("provider_key", "whatsapp_bhash")
    .eq("config_json->>webhook_token", token)
    .maybeSingle();

  if (configErr) {
    console.error("[Bhash Webhook] DB error querying provider config:", configErr.message);
    return NextResponse.json({ error: "Database transaction failed" }, { status: 500 });
  }

  if (!providerConfig) {
    return NextResponse.json(
      { error: "Tenant webhook endpoint not found" },
      { status: 404 }
    );
  }

  if (!providerConfig.is_active) {
    return NextResponse.json(
      { error: "Webhook token is disabled or suspended" },
      { status: 401 }
    );
  }

  const tenantId = providerConfig.tenant_id;

  // 4. Read Raw Body as Plain Text
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch (err) {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload exceeds maximum allowed size of 64KB" },
      { status: 413 }
    );
  }

  if (!rawBody || rawBody.trim() === "") {
    return NextResponse.json({ error: "Empty request payload" }, { status: 400 });
  }

  // 5. Parse Plain-Text Payload using Marker-Based Parser
  const parseResult = parseBhashPlainTextPayload(rawBody);
  if (!parseResult.success || !parseResult.data) {
    return NextResponse.json(
      { error: parseResult.error || "Malformed plain text payload" },
      { status: 400 }
    );
  }

  const { mobile, rawMobile, message, name } = parseResult.data;

  // 6. Best-effort In-Flight Concurrency Lock (guards simultaneous network race retries)
  const messageDigest = crypto.createHash("sha256").update(message).digest("hex");
  const lockKey = `${tenantId}:${mobile}:${messageDigest}`;

  const lockAcquired = acquireInFlightLock(lockKey);
  if (!lockAcquired) {
    // Exact identical message is currently in-flight in this isolate
    return NextResponse.json(
      { success: true, status: "duplicate_in_flight_ignored" },
      { status: 200 }
    );
  }

  // 7. Internal Event Identity & Timestamp Generation
  // External message ID is explicitly null (vendor does not provide it).
  // Provider timestamp is explicitly null (server receipt time is recorded separately).
  const internalEventId = generateInternalEventId();
  const receivedAt = new Date().toISOString();

  try {
    // 8. Atomic CRM Persistence via LeadIngestionService
    // Scoped strictly to resolved tenantId + normalized phone.
    const ingestionResult = await leadIngestionService.processInboundMessage({
      tenant_id: tenantId,
      phone: mobile,
      name: name || undefined,
      message,
      timestamp: receivedAt,
      rawPayload: {
        raw: rawBody,
        internal_event_id: internalEventId,
        source: "WEBHOOK",
        provider: "bhash_api",
        raw_mobile: rawMobile,
      },
    });

    // 9. Durable Webhook Audit Log
    try {
      await db.from("webhook_logs").insert({
        tenant_id: tenantId,
        idempotency_key: internalEventId,
        provider: "bhash",
        payload: {
          raw: rawBody,
          parsed: parseResult.data,
          internal_event_id: internalEventId,
          received_at: receivedAt,
          external_message_id: null,
          provider_timestamp: null,
          lead_id: ingestionResult.lead.id,
          message_id: ingestionResult.messageId || null,
        },
        status: "processed",
      });
    } catch (logErr) {
      console.warn("[Bhash Webhook] Webhook audit log insert notice:", logErr);
    }

    // 10. Release In-Flight Lock
    releaseInFlightLock(lockKey);

    // 11. Return HTTP 200 Promptly After Durable Persistence
    return NextResponse.json(
      {
        success: true,
        event_id: internalEventId,
        lead_id: ingestionResult.lead.id,
        is_new_lead: ingestionResult.isNewLead,
        status: "accepted",
      },
      { status: 200 }
    );
  } catch (err: any) {
    releaseInFlightLock(lockKey);
    console.error("[Bhash Webhook] Fatal ingestion failure:", err);

    // Log failure to webhook_logs
    try {
      await db.from("webhook_logs").insert({
        tenant_id: tenantId,
        idempotency_key: internalEventId,
        provider: "bhash",
        payload: {
          raw: rawBody,
          parsed: parseResult.data,
          internal_event_id: internalEventId,
          error: err.message,
        },
        status: "failed",
        error_message: err.message,
      });
    } catch {}

    // Return 500 so upstream provider knows to retry
    return NextResponse.json(
      { error: "Database transaction failed" },
      { status: 500 }
    );
  }
}
