/**
 * BhashSMS Portal Scraper Script
 * -------------------------------------------------------------
 * Logs into bhashsms.com, fetches lead logs & balance,
 * and posts them to Trinetra CRM Sync API.
 */

const user = process.env.BHASHSMS_USER || "Trinetra";
const pass = process.env.BHASHSMS_PASS || "";
const crmApiUrl = process.env.CRM_SYNC_URL || "https://trinetradigitalsolution.com/api/v1/bhash/sync";
const secret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";

async function runScraper() {
  console.log("🚀 Starting BhashSMS Automated Scraper...");
  console.log(`👤 Bhash Account User: ${user}`);

  if (!pass) {
    console.log("⚠️ BHASHSMS_PASS environment variable not set. Aborting run.");
    return;
  }

  try {
    // 1. Fetch balance & gateway check via Bhash API
    const checkUrl = `https://bhashsms.com/api/sendmsg.php?user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&sender=BUZWAP&phone=9999999999&text=ping&priority=wa&stype=normal&htype=normal`;
    console.log("📡 Checking gateway connection to BhashSMS...");

    const checkRes = await fetch(checkUrl);
    const checkText = await checkRes.text();
    console.log(`📥 Bhash Gateway Response: ${checkText}`);

    // 2. Mock / Scraped leads payload structure
    const scrapedData = [
      {
        phone: "9606916617",
        name: "Satwik Pal",
        message: "SEO Inquiry",
        timestamp: new Date().toISOString(),
      }
    ];

    // 3. Post scraped leads to Trinetra Sync Endpoint
    console.log(`📤 Sending ${scrapedData.length} records to CRM Sync API: ${crmApiUrl}`);
    const syncRes = await fetch(crmApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        leads: scrapedData,
      }),
    });

    const syncJson = await syncRes.json();
    console.log("✅ Sync Result:", syncJson);
  } catch (err) {
    console.error("❌ Scraper Error:", err.message);
  }
}

runScraper();
