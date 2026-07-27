import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { leadIngestionService } from "@/services/leadIngestionService";
import { classifyInboundMessage } from "@/services/leadClassifierService";
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

async function fetchAndParseBhashLeads() {
  const username = process.env.BHASHSMS_USER || "Trinetra";
  const password = process.env.BHASHSMS_PASS || "SatwikPal@123Shubham";

  console.log(`[BhashSyncEngine] Authenticating username: ${username}...`);
  const loginRes = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/loginHandle.php",
    { username, password },
    "",
    "https://digifast.site/dltstatus/bwa/Pages/login.php"
  );

  const cookieHeader = loginRes.cookies ? loginRes.cookies.map((c: string) => c.split(";")[0]).join("; ") : "";
  if (!cookieHeader) {
    throw new Error("Bhash authentication login session failed.");
  }

  const today = new Date();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const fromdate = formatDate(ninetyDaysAgo);
  const todate = formatDate(today);

  console.log(`[BhashSyncEngine] Fetching dynamic list from ${fromdate} to ${todate}...`);
  const reportRes = await postForm(
    "https://digifast.site/dltstatus/bwa/Pages/waincommingDisplay.php",
    { fromdate, todate },
    cookieHeader,
    "https://digifast.site/dltstatus/bwa/Pages/waincomingreplies.php"
  );

  if (!reportRes.body) {
    throw new Error("Empty response received from BWA report page.");
  }

  const rows = reportRes.body.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!rows || rows.length <= 1) {
    console.log("[BhashSyncEngine] No inbound records found in dashboard.");
    return [];
  }

  const leads: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const rowHtml = rows[i];
    const cols = rowHtml.match(/<td[\s\S]*?<\/td>/gi);
    if (cols && cols.length >= 3) {
      const cleanCols = cols.map((c: string) => c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      const rawPhone = cleanCols[0] ? cleanCols[0].replace(/\D/g, "") : "";
      const phone = rawPhone.slice(-10);
      const name = cleanCols[1] || `WhatsApp Lead (${phone.slice(-4)})`;
      const message = cleanCols[2] || "Incoming WhatsApp Message";
      const timeStr = cleanCols[3] || "Recently";

      if (phone && phone.length === 10) {
        leads.push({
          id: `bwa-${phone}-${message.replace(/\W/g, "").slice(0, 15)}-${timeStr.replace(/\W/g, "")}`,
          phone,
          name: (name && name !== "Recipient Name") ? name : `Lead (${phone.slice(-4)})`,
          message,
          timestamp: new Date().toISOString(),
          timeStr,
        });
      }
    }
  }

  console.log(`[BhashSyncEngine] Parsed ${leads.length} records. Returning oldest first.`);
  return leads.reverse();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const cron = url.searchParams.get("cron");

  const expectedSecret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";
  
  if (secret === expectedSecret || cron === "true") {
    // Trigger live scraper on GET requests for cron/refresh events!
    try {
      console.log("[BhashSync] GET cron trigger detected. Running live HTTPS scrape...");
      const scrapedLeads = await fetchAndParseBhashLeads();
      
      let newLeadsDetected = 0;
      const processedResults = [];

      for (const item of scrapedLeads) {
        const phone = String(item.phone || item.mobile || "").replace(/\D/g, "").slice(-10);
        if (!phone || phone.length < 10) continue;

        // Run JavaScript Naive Bayes Lead Classifier natively
        const mlResult = classifyInboundMessage(item.message, phone, item.node || "6206", []);

        const result = await leadIngestionService.processInboundMessage({
          tenant_id: "00000000-0000-0000-0000-000000000001",
          phone,
          name: item.name || `WhatsApp Lead (${phone.slice(-4)})`,
          message: item.message || item.last_message || "Incoming lead from Bhash Portal",
          flow_node: item.node || "6206",
          meta_message_id: item.id || `scrape-${phone}-${Date.now()}`,
          timestamp: item.timestamp || new Date().toISOString(),
          rawPayload: {
            ...item,
            ml_intent: mlResult.intent,
            ml_probability: mlResult.probability,
            ml_score: mlResult.score,
            ml_temperature: mlResult.leadTemperature,
            ml_summary: mlResult.summary,
            ml_suggested_action: mlResult.suggestedAction,
            ml_metadata: mlResult.metadata
          },
        });

        if (result.isNewLead) {
          newLeadsDetected++;
        }
        processedResults.push(result);
      }

      return NextResponse.json({
        success: true,
        syncedCount: processedResults.length,
        newLeadsDetected,
        message: `Successfully synced ${processedResults.length} records. ${newLeadsDetected} new leads detected!`,
      });
    } catch (err: any) {
      console.error("❌ Bhash Sync Cron Error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // Standard behavior: return dashboard data
  const db = getSupabaseAdmin();
  try {
    const { data: leads } = await db
      .from("leads")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);

    const { data: messages } = await db
      .from("bhash_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      leads: leads || [],
      messages: messages || [],
      syncStatus: {
        lastSyncedAt: new Date().toISOString(),
        totalLeads: leads?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const { secret } = body;
    let scrapedLeads = body.leads;

    // Optional secret check if triggered by GitHub Actions scraper (skip if manual sync)
    const expectedSecret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";
    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized scraper request" }, { status: 401 });
    }

    // Trigger local server scraper if no leads array passed in body (e.g. manual sync button click)
    if (!scrapedLeads || !Array.isArray(scrapedLeads) || scrapedLeads.length === 0) {
      console.log("[BhashSync] Empty leads array. Triggering live HTTPS scrape...");
      scrapedLeads = await fetchAndParseBhashLeads();
    }

    let newLeadsDetected = 0;
    const processedResults = [];

    if (Array.isArray(scrapedLeads)) {
      for (const item of scrapedLeads) {
        const phone = String(item.phone || item.mobile || "").replace(/\D/g, "").slice(-10);
        if (!phone || phone.length < 10) continue;

        // Run JavaScript Naive Bayes Lead Classifier natively
        const mlResult = classifyInboundMessage(item.message, phone, item.node || "6206", []);

        const result = await leadIngestionService.processInboundMessage({
          tenant_id: "00000000-0000-0000-0000-000000000001",
          phone,
          name: item.name || `WhatsApp Lead (${phone.slice(-4)})`,
          message: item.message || item.last_message || "Incoming lead from Bhash Portal",
          flow_node: item.node || "6206",
          meta_message_id: item.id || `scrape-${phone}-${Date.now()}`,
          timestamp: item.timestamp || new Date().toISOString(),
          rawPayload: {
            ...item,
            ml_intent: mlResult.intent,
            ml_probability: mlResult.probability,
            ml_score: mlResult.score,
            ml_temperature: mlResult.leadTemperature,
            ml_summary: mlResult.summary,
            ml_suggested_action: mlResult.suggestedAction,
            ml_metadata: mlResult.metadata
          },
        });

        if (result.isNewLead) {
          newLeadsDetected++;
        }
        processedResults.push(result);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: processedResults.length,
      newLeadsDetected,
      message: `Successfully synced ${processedResults.length} records. ${newLeadsDetected} new leads detected!`,
    });
  } catch (err: any) {
    console.error("❌ Bhash Sync Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
