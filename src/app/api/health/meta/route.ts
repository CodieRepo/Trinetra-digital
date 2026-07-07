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

export async function GET() {
  const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

  let supabaseConnected = false;
  let tokenValid = false;
  let phoneConnected = false;
  let wabaConnected = false;
  let graphApiReachable = false;
  
  const statusDetails: any = {};
  
  // 1. Supabase Check
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("tenants").select("id").limit(1);
    if (!error) {
      supabaseConnected = true;
      statusDetails.supabase = "Connected successfully";
    } else {
      statusDetails.supabase = `Query error: ${error.message}`;
    }
  } catch (e: any) {
    statusDetails.supabase = `Connection failed: ${e.message}`;
  }

  // 2. Graph API & Access Token check (Query /me)
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${accessToken}`);
    const data = await res.json();
    graphApiReachable = res.ok;
    if (res.ok && !data.error) {
      tokenValid = true;
      statusDetails.accessToken = `Valid (ID: ${data.id})`;
    } else {
      statusDetails.accessToken = `Invalid: ${data.error?.message || "Auth Error"}`;
    }
  } catch (e: any) {
    statusDetails.accessToken = `API Query Exception: ${e.message}`;
  }

  // 3. Phone Number Check
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}?access_token=${accessToken}`);
    const data = await res.json();
    if (res.ok && !data.error) {
      phoneConnected = true;
      statusDetails.phoneNumber = `Connected (${data.verified_name || "Active"})`;
    } else {
      statusDetails.phoneNumber = `Error: ${data.error?.message || "Not found"}`;
    }
  } catch (e: any) {
    statusDetails.phoneNumber = `Query Exception: ${e.message}`;
  }

  // 4. WABA Check
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}?access_token=${accessToken}`);
    const data = await res.json();
    if (res.ok && !data.error) {
      wabaConnected = true;
      statusDetails.waba = `Connected (${data.name || "Active"})`;
    } else {
      statusDetails.waba = `Error: ${data.error?.message || "Not found"}`;
    }
  } catch (e: any) {
    statusDetails.waba = `Query Exception: ${e.message}`;
  }

  // 5. Webhook Settings check
  statusDetails.verifyTokenSet = !!verifyToken;
  
  const allHealthy = supabaseConnected && tokenValid && phoneConnected && wabaConnected && graphApiReachable;

  return NextResponse.json({
    healthy: allHealthy,
    status: allHealthy ? "OK" : "DEGRADED",
    timestamp: new Date().toISOString(),
    checks: {
      supabaseConnected,
      graphApiReachable,
      tokenValid,
      phoneConnected,
      wabaConnected
    },
    details: statusDetails
  }, { status: allHealthy ? 200 : 500 });
}
