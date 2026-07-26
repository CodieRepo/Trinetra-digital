/**
 * BhashSMS Business WhatsApp (BWA) Automated Scraper Engine
 * -----------------------------------------------------------------
 * Logins to Bhash BWA portal (https://digifast.site/dltstatus/bwa/Pages/),
 * scrapes live incoming WhatsApp messages & leads from waincommingDisplay.php,
 * and syncs them into Trinetra CRM.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load .env variables if running locally
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (key && value) process.env[key] = value;
    }
  });
}

const username = process.env.BHASHSMS_USER || "Trinetra";
const password = process.env.BHASHSMS_PASS || "SatwikPal@123Shubham";
const crmSyncUrl = process.env.CRM_SYNC_URL || "https://trinetradigitalsolution.com/api/v1/bhash/sync";
const secret = process.env.SCRAPER_SECRET || "trinetra-scraper-secret-2026";

function postForm(urlStr, formData, cookieStr = '', refererUrl = '') {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const postData = new URLSearchParams(formData).toString();

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': refererUrl || 'https://digifast.site/dltstatus/bwa/Pages/login.php',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, cookies, body: data }));
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function runScraper() {
  console.log("🚀 Starting BhashSMS BWA Portal Scraper...");
  console.log(`👤 User: ${username}`);

  try {
    // 1. Authenticate with BWA Portal
    console.log("🔐 Logging into BWA Portal at digifast.site...");
    const loginRes = await postForm(
      'https://digifast.site/dltstatus/bwa/Pages/loginHandle.php',
      { username, password },
      '',
      'https://digifast.site/dltstatus/bwa/Pages/login.php'
    );

    const cookieHeader = loginRes.cookies ? loginRes.cookies.map(c => c.split(';')[0]).join('; ') : '';
    console.log(`✅ Login Status: ${loginRes.statusCode}, Cookie: ${cookieHeader}`);

    // 2. Fetch Incoming Replies Report (dynamic range - past 90 days to today)
    const today = new Date();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const fromdate = formatDate(ninetyDaysAgo);
    const todate = formatDate(today);

    console.log(`📡 Fetching Incoming WhatsApp Reports from ${fromdate} to ${todate}...`);
    const reportRes = await postForm(
      'https://digifast.site/dltstatus/bwa/Pages/waincommingDisplay.php',
      { fromdate, todate },
      cookieHeader,
      'https://digifast.site/dltstatus/bwa/Pages/waincomingreplies.php'
    );

    console.log(`📥 Report Status: ${reportRes.statusCode}, Body Length: ${reportRes.body?.length || 0}`);

    if (!reportRes.body) {
      console.log("⚠️ Empty response received from BWA report page.");
      return;
    }

    // 3. Extract Table Rows from HTML
    const rows = reportRes.body.match(/<tr[\s\S]*?<\/tr>/gi);
    console.log(`📊 Raw table rows found: ${rows ? rows.length : 0}`);

    if (!rows || rows.length <= 1) {
      console.log("ℹ️ No incoming WhatsApp messages found in portal for selected date range.");
      return;
    }

    console.log(`✨ Found ${rows.length - 1} message records in BWA Portal! Parsing data...`);

    const scrapedLeads = [];
    for (let i = 1; i < rows.length; i++) {
      const rowHtml = rows[i];
      const cols = rowHtml.match(/<td[\s\S]*?<\/td>/gi);
      if (cols && cols.length >= 3) {
        const cleanCols = cols.map(c => c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
        const rawPhone = cleanCols[0] ? cleanCols[0].replace(/\D/g, '') : '';
        const phone = rawPhone.slice(-10);
        const name = cleanCols[1] || `WhatsApp Lead (${phone.slice(-4)})`;
        const message = cleanCols[2] || 'Incoming WhatsApp Message';
        const timeStr = cleanCols[3] || 'Recently';

        if (phone && phone.length === 10) {
          scrapedLeads.push({
            id: `bwa-${phone}-${message.replace(/\W/g, '').slice(0, 15)}-${timeStr.replace(/\W/g, '')}`,
            phone,
            name: (name && name !== 'Recipient Name') ? name : `Lead (${phone.slice(-4)})`,
            message,
            timestamp: new Date().toISOString(),
            timeStr,
          });
        }
      }
    }

    console.log(`📋 Successfully extracted ${scrapedLeads.length} clean leads!`);
    
    // Reverse array so that oldest messages are processed first, ensuring newest message is synced last
    const chronologicalLeads = scrapedLeads.reverse();

    // 4. Run Python ML Classifier on each lead locally to avoid Vercel timeouts/API costs
    console.log("🧠 Running local Python ML Classifier on scraped leads...");
    const enrichedLeads = [];
    for (const lead of chronologicalLeads) {
      try {
        const history = enrichedLeads
          .filter(l => l.phone === lead.phone)
          .map(l => l.ml_metadata?.flow_node || '6206');

        const payload = {
          message: lead.message,
          phone: lead.phone,
          flow_node: '6206',
          history: history
        };

        const jsonArg = JSON.stringify(payload);
        let cmd = '';
        if (process.platform === 'win32') {
          const escapedJsonArg = jsonArg.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          cmd = `python scripts/classify_leads.py "${escapedJsonArg}"`;
        } else {
          cmd = `python3 scripts/classify_leads.py '${jsonArg}'`;
        }

        const stdout = execSync(cmd, { encoding: 'utf8' });
        const mlResult = JSON.parse(stdout.trim());

        enrichedLeads.push({
          ...lead,
          ml_intent: mlResult.intent,
          ml_probability: mlResult.probability,
          ml_score: mlResult.score,
          ml_temperature: mlResult.leadTemperature,
          ml_summary: mlResult.summary,
          ml_suggested_action: mlResult.suggestedAction,
          ml_metadata: mlResult.metadata
        });
      } catch (mlErr) {
        console.warn(`⚠️ ML classification failed for lead ${lead.phone}:`, mlErr.message);
        enrichedLeads.push(lead);
      }
    }

    // 5. Sync leads with Trinetra CRM Endpoint
    console.log(`📤 Syncing ${enrichedLeads.length} leads in chronological order to CRM (${crmSyncUrl})...`);
    const syncRes = await fetch(crmSyncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        leads: enrichedLeads,
      }),
    });

    const syncJson = await syncRes.json();
    console.log("🎉 Sync Completed Successfully!", syncJson);
    return syncJson;
  } catch (err) {
    console.error("❌ BWA Scraper Error:", err.message);
  }
}

// Run if executed directly via node
runScraper();
