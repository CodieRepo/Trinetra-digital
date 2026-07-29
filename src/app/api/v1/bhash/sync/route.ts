import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { leadIngestionService } from "@/services/leadIngestionService";
import { classifyInboundMessage } from "@/services/leadClassifierService";
import { generateFingerprint } from "@/utils/bhashHelper";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function postForm(urlStr: string, formData: any, cookieStr = "", refererUrl = ""): Promise<any> {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const postData = new URLSearchParams(formData).toString();

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "Cookie": cookieStr,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": refererUrl || "https://digifast.site/dltstatus/bwa/Pages/login.php",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      const cookies = res.headers["set-cookie"];
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, cookies, body: data }));
    });

    req.on("error", (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchAndParseBhashLeads(db: any, tenantId: string) {
  // Resolve Bhash credentials
  const { data: tenant } = await db
    .from("tenants")
    .select("whatsapp_phone_number_id, whatsapp_access_token_encrypted")
    .eq("id", tenantId)
    .maybeSingle();

  const username = tenant?.whatsapp_phone_number_id || process.env.BHASHSMS_USER || "Trinetra";
  const password = tenant?.whatsapp_access_token_encrypted || process.env.BHASHSMS_PASS;

  console.log(`[BhashSyncEngine] Authenticating Bhash portal: user=${username}...`);
  
  const loginRes = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/loginHandle.php",
    { username, password },
    "",
    "https://digifast.site/dltstatus/bwa/Pages/login.php"
  );

  const cookieHeader = loginRes.cookies ? loginRes.cookies.map((c: string) => c.split(";")[0]).join("; ") : "";
  
  if (!cookieHeader || loginRes.statusCode !== 302) {
    await updateScraperStatusTelemetry(db, tenantId, "degraded", "Auth login failed");
    throw new Error("Bhash authentication login session failed.");
  }

  // Update status telemetry to connected
  await updateScraperStatusTelemetry(db, tenantId, "connected", "Auth login success");

  const today = new Date();
  const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const fromdate = formatDate(oneDayAgo);
  const todate = formatDate(today);

  console.log(`[BhashSyncEngine] Fetching displays: ${fromdate} to ${todate}...`);
  const reportRes = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/waincommingDisplay.php",
    { fromdate, todate },
    cookieHeader,
    "https://digifast.site/dltstatus/bwa/Pages/waincomingreplies.php"
  );

  if (!reportRes.body) {
    throw new Error("Empty response received from BWA portal replies display page.");
  }

  const rows = reportRes.body.match(new RegExp("<tr[\\s\\S]*?<\\/tr>", "gi"));
  if (!rows || rows.length <= 1) {
    console.log("[BhashSyncEngine] No inbound records found in dashboard table.");
    return [];
  }

  const leads: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const rowHtml = rows[i];
    const cols = rowHtml.match(new RegExp("<td[\\s\\S]*?<\\/td>", "gi"));
    if (cols && cols.length >= 3) {
      const cleanCols = cols.map((c: string) => c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      const rawPhone = cleanCols[0] ? cleanCols[0].replace(/\D/g, "") : "";
      const phone = rawPhone.slice(-10);
      const name = cleanCols[1] || `WhatsApp Lead (${phone.slice(-4)})`;
      const message = cleanCols[2] || "Incoming WhatsApp Message";
      const timeStr = cleanCols[3] || "Recently";

      if (phone && phone.length === 10) {
        leads.push({
          phone,
          name: (name && name !== "Recipient Name") ? name : `Lead (${phone.slice(-4)})`,
          message,
          timeStr,
        });
      }
    }
  }

  return leads.reverse(); // oldest first
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const cron = url.searchParams.get("cron");

  const expectedSecret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";
  if (secret !== expectedSecret && cron !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = "00000000-0000-0000-0000-000000000001";
  const db = getSupabaseAdmin();

  try {
    const scrapedLeads = await fetchAndParseBhashLeads(db, tenantId);
    let duplicatesPrevented = 0;
    let recoveryImports = 0;

    for (const item of scrapedLeads) {
      const phone = item.phone;
      const message = item.message;
      
      // Parse the portal row timestamp safely
      const parsedTime = item.timeStr && item.timeStr !== "Recently" ? new Date(item.timeStr) : new Date();
      const messageTimestamp = parsedTime.toISOString();

      // Compute normalized row fingerprint
      const fingerprint = generateFingerprint(phone, message, messageTimestamp);

      // Check if message already exists by fingerprint
      const { data: existingMsg } = await db
        .from("messages")
        .select("id")
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (existingMsg) {
        duplicatesPrevented++;
        continue;
      }

      // Record recovery import sync statistics
      recoveryImports++;

      // Run Naive Bayes Lead Classifier on the recovered message
      const mlResult = classifyInboundMessage(message, phone, "6206", []);

      // Ingest the missing message
      await leadIngestionService.processInboundMessage({
        tenant_id: tenantId,
        phone,
        name: item.name,
        message,
        flow_node: "6206",
        meta_message_id: fingerprint, // unique log reference ID
        timestamp: messageTimestamp,
        rawPayload: {
          ...item,
          source: "SCRAPER",
          provider: "bhash_scraper",
          ml_intent: mlResult.intent,
          ml_probability: mlResult.probability,
          ml_score: mlResult.score,
          ml_temperature: mlResult.leadTemperature,
          ml_summary: mlResult.summary,
          ml_suggested_action: mlResult.suggestedAction,
          ml_metadata: mlResult.metadata
        }
      });
    }

    // Save telemetry stats to config_json
    await updateScraperRunTelemetry(db, tenantId, duplicatesPrevented, recoveryImports);

    return NextResponse.json({
      success: true,
      scrapedCount: scrapedLeads.length,
      duplicatesPrevented,
      recoveryImports,
      message: `Reconciliation complete. Prevented: ${duplicatesPrevented}, Recovered: ${recoveryImports}`
    });
  } catch (err: any) {
    console.error("❌ Bhash Sync Cron GET Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const { secret, leads } = body;
  const expectedSecret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";
  if (secret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = "00000000-0000-0000-0000-000000000001";

  try {
    let scrapedLeads = leads;
    if (!scrapedLeads || !Array.isArray(scrapedLeads) || scrapedLeads.length === 0) {
      scrapedLeads = await fetchAndParseBhashLeads(db, tenantId);
    }

    let duplicatesPrevented = 0;
    let recoveryImports = 0;

    for (const item of scrapedLeads) {
      const phone = item.phone;
      const message = item.message;
      
      const parsedTime = item.timeStr && item.timeStr !== "Recently" ? new Date(item.timeStr) : new Date();
      const messageTimestamp = parsedTime.toISOString();
      const fingerprint = generateFingerprint(phone, message, messageTimestamp);

      const { data: existingMsg } = await db
        .from("messages")
        .select("id")
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (existingMsg) {
        duplicatesPrevented++;
        continue;
      }

      recoveryImports++;
      const mlResult = classifyInboundMessage(message, phone, "6206", []);

      await leadIngestionService.processInboundMessage({
        tenant_id: tenantId,
        phone,
        name: item.name,
        message,
        flow_node: "6206",
        meta_message_id: fingerprint,
        timestamp: messageTimestamp,
        rawPayload: {
          ...item,
          source: "SCRAPER",
          provider: "bhash_scraper",
          ml_intent: mlResult.intent,
          ml_probability: mlResult.probability,
          ml_score: mlResult.score,
          ml_temperature: mlResult.leadTemperature,
          ml_summary: mlResult.summary,
          ml_suggested_action: mlResult.suggestedAction,
          ml_metadata: mlResult.metadata
        }
      });
    }

    await updateScraperRunTelemetry(db, tenantId, duplicatesPrevented, recoveryImports);

    return NextResponse.json({
      success: true,
      scrapedCount: scrapedLeads.length,
      duplicatesPrevented,
      recoveryImports,
      message: `Reconciliation complete. Prevented: ${duplicatesPrevented}, Recovered: ${recoveryImports}`
    });
  } catch (err: any) {
    console.error("❌ Bhash Sync Cron POST Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function updateScraperStatusTelemetry(db: any, tenantId: string, status: string, details: string) {
  try {
    const { data: config } = await db
      .from("provider_configs")
      .select("config_json")
      .eq("tenant_id", tenantId)
      .eq("provider_key", "whatsapp_bhash")
      .maybeSingle();

    const configJson = config?.config_json || {};
    const health = configJson.health || {};
    
    health.scraper_status = status;
    health.portal_login_status = details;
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
    console.error("Scraper status telemetry update error:", e);
  }
}

async function updateScraperRunTelemetry(db: any, tenantId: string, duplicates: number, imports: number) {
  try {
    const { data: config } = await db
      .from("provider_configs")
      .select("config_json")
      .eq("tenant_id", tenantId)
      .eq("provider_key", "whatsapp_bhash")
      .maybeSingle();

    const configJson = config?.config_json || {};
    const health = configJson.health || {};
    
    health.last_scrape_at = new Date().toISOString();
    health.duplicates_prevented_count = (health.duplicates_prevented_count || 0) + duplicates;
    health.recovery_imports_count = (health.recovery_imports_count || 0) + imports;
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
    console.error("Scraper run telemetry update error:", e);
  }
}
