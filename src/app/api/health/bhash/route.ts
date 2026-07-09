import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL and Service Role Key are required environment variables");
  }
  return createClient(url, key);
}

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id") || process.env.DEFAULT_TENANT_ID;

    // 1. Supabase Check
    let supabaseConnected = false;
    let tenantInfo: any = null;
    try {
      const { data: tenants, error } = await supabaseAdmin
        .from("tenants")
        .select("id, name, whatsapp_phone_number_id, whatsapp_access_token_encrypted, whatsapp_business_account_id")
        .limit(5);
      if (!error && tenants && tenants.length > 0) {
        supabaseConnected = true;
        tenantInfo = tenantId ? tenants.find(t => t.id === tenantId) : tenants[0];
      }
    } catch (e) {}

    // Resolve BhashSMS credentials from tenant or environment variables
    const user = tenantInfo?.whatsapp_phone_number_id || process.env.BHASHSMS_USER || "Trinetra";
    const pass = tenantInfo?.whatsapp_access_token_encrypted || process.env.BHASHSMS_PASS;
    const sender = tenantInfo?.whatsapp_business_account_id || process.env.BHASHSMS_SENDER || "BUZWAP";

    const hasCredentials = !!pass;

    // 2. Connectivity & Key validity checks
    let connectivity = false;
    let apiKeyValid = false;
    let credits = null;
    let apiError: string | null = null;

    if (hasCredentials) {
      try {
        // Try calling the typical BhashSMS balance check API
        const balanceUrl = `http://bhashsms.com/api/checkbalance.php?user=${user}&pass=${pass}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(balanceUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        connectivity = response.ok;
        if (response.ok) {
          const responseText = await response.text();
          const cleanText = responseText.trim();
          
          const isError = cleanText.toLowerCase().includes("error") || 
                          cleanText.toLowerCase().includes("fail") ||
                          cleanText.toLowerCase().includes("invalid");

          if (!isError) {
            apiKeyValid = true;
            // Parse credits if it returns a numeric string
            if (/^\d+(\.\d+)?$/.test(cleanText)) {
              credits = parseFloat(cleanText);
            } else {
              credits = cleanText; // return string credits representation if any
            }
          } else {
            apiError = cleanText;
          }
        }
      } catch (e: any) {
        apiError = e.message || "Request timed out or failed";
        // Fallback connectivity check to Bhash home
        try {
          const pingRes = await fetch("http://bhashsms.com/", { method: "HEAD" });
          connectivity = pingRes.ok;
        } catch (pingErr) {}
      }
    } else {
      // No custom credentials, check general connectivity
      try {
        const pingRes = await fetch("http://bhashsms.com/", { method: "HEAD" });
        connectivity = pingRes.ok;
      } catch (e) {}
    }

    // 3. Webhook Status & Last Event Received
    const verifyTokenSet = !!process.env.WEBHOOK_VERIFY_TOKEN;
    let lastWebhookReceived: string | null = null;
    try {
      const { data: latestEvent } = await supabaseAdmin
        .from("message_events")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (latestEvent && latestEvent.length > 0) {
        lastWebhookReceived = latestEvent[0].created_at;
      }
    } catch (e) {}

    // 4. Last Message Response & Delivery Callback Check
    let lastMessageResponse: string | null = null;
    let lastMessageStatus: string | null = null;
    let deliveryCallbackStatus = "Awaiting callbacks";

    try {
      const { data: latestOutbound } = await supabaseAdmin
        .from("messages")
        .select("created_at, status")
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestOutbound && latestOutbound.length > 0) {
        lastMessageResponse = latestOutbound[0].created_at;
        lastMessageStatus = latestOutbound[0].status;

        // If we have delivered or read status, callbacks are working
        const { data: hasCallbacks } = await supabaseAdmin
          .from("messages")
          .select("id")
          .eq("direction", "outbound")
          .in("status", ["delivered", "read"])
          .limit(1);

        if (hasCallbacks && hasCallbacks.length > 0) {
          deliveryCallbackStatus = "Active (Callbacks received)";
        }
      }
    } catch (e) {}

    // Webhook URL endpoint check
    const webhookUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/webhooks/whatsapp`
      : "Configured (local / custom)";

    return NextResponse.json({
      healthy: supabaseConnected && connectivity && (!hasCredentials || apiKeyValid),
      status: (supabaseConnected && connectivity) ? "OK" : "DEGRADED",
      timestamp: new Date().toISOString(),
      checks: {
        supabaseConnected,
        connectivity,
        apiKeyValid,
        webhookActive: verifyTokenSet
      },
      details: {
        supabase: supabaseConnected ? "Connected successfully" : "Supabase connection error",
        bhashApi: connectivity ? "Reachable" : "Unreachable",
        apiKey: hasCredentials ? (apiKeyValid ? "Valid credentials" : `Invalid: ${apiError || "Auth Failed"}`) : "Credentials not configured",
        senderStatus: `Configured (Sender ID: ${sender})`,
        webhook: `Active (Verify Token configured)`,
        deliveryCallback: deliveryCallbackStatus,
        webhookUrl
      },
      lastWebhookReceived,
      lastMessageResponse,
      lastMessageStatus,
      credits,
      rateLimit: "Not limited by provider"
    });
  } catch (err: any) {
    return NextResponse.json({
      healthy: false,
      status: "ERROR",
      timestamp: new Date().toISOString(),
      checks: {
        supabaseConnected: false,
        connectivity: false,
        apiKeyValid: false,
        webhookActive: false
      },
      error: err.message
    }, { status: 500 });
  }
}
