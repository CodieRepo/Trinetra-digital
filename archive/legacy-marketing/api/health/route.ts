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
    
    // Resolve Tenant ID (fallback to DEFAULT_TENANT_ID)
    const tenantId = searchParams.get("tenant_id") || process.env.DEFAULT_TENANT_ID;
    
    // 1. Verify Supabase Connection
    // Try to run a simple query
    const { data: tenantCheck, error: supabaseErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, whatsapp_phone_number_id, whatsapp_access_token_encrypted")
      .limit(1);
      
    const supabaseConnected = !supabaseErr;
    
    let bhashConnected = false;
    let tenantName = "Trinetra Workspace";
    
    if (supabaseConnected && tenantCheck && tenantCheck.length > 0) {
      // Find matching tenant or default to first
      const activeTenant = tenantId ? tenantCheck.find(t => t.id === tenantId) : tenantCheck[0];
      if (activeTenant) {
        tenantName = activeTenant.name;
        bhashConnected = !!(activeTenant.whatsapp_phone_number_id && activeTenant.whatsapp_access_token_encrypted);
      }
    }
    
    // 2. Verify AI Provider Configuration
    const aiConnected = !!(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY);
    
    // 3. Fetch Last Webhook Received Time
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
    
    // 4. Fetch Last Sync Time & Messages Info
    let lastInbound: string | null = null;
    let lastOutbound: string | null = null;
    let pendingMessages = 0;
    
    try {
      const { data: inbound } = await supabaseAdmin
        .from("messages")
        .select("created_at")
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1);
      if (inbound && inbound.length > 0) lastInbound = inbound[0].created_at;
      
      const { data: outbound } = await supabaseAdmin
        .from("messages")
        .select("created_at")
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1);
      if (outbound && outbound.length > 0) lastOutbound = outbound[0].created_at;
      
      const { count } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued");
        
      pendingMessages = count || 0;
    } catch (e) {}
    
    return NextResponse.json({
      supabaseConnected,
      bhashConnected,
      aiConnected,
      tenantName,
      details: {
        supabase: supabaseConnected ? "Connected" : "Disconnected",
        bhash: bhashConnected ? "Connected" : "Credentials Missing",
        ai: aiConnected ? "Connected" : "API Key Missing",
      },
      lastWebhookReceived,
      lastSyncTime: new Date().toISOString(),
      lastInboundMessageTimestamp: lastInbound,
      lastOutboundMessageTimestamp: lastOutbound,
      pendingMessages
    });
  } catch (err: any) {
    return NextResponse.json({
      supabaseConnected: false,
      bhashConnected: false,
      aiConnected: false,
      details: {
        supabase: "Error",
        bhash: "Error",
        ai: "Error"
      },
      error: err.message
    }, { status: 500 });
  }
}
