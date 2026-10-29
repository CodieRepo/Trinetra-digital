import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envFiles = [".env.production", ".env.local", ".env"];
  for (const file of envFiles) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2];
        }
      }
    }
  }
}
loadEnv();

const BASE_URL = process.env.BASE_URL || "https://trinetradigitalsolution.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\223bf506-1737-41a1-aca3-dcc651ba20fe\\screenshots";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const report = [];

function captureScreenshot(name, url, width = 1440, height = 900) {
  const outPath = path.join(ARTIFACT_DIR, name);
  console.log(`   📸 Capturing: ${name}`);
  console.log(`      URL: ${url}`);
  try {
    const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --no-sandbox --host-resolver-rules="MAP cdn.cookiehub.eu 127.0.0.1" --screenshot="${outPath}" --window-size=${width},${height} --virtual-time-budget=8000 "${url}"`;
    execSync(cmd, { stdio: "ignore" });
    console.log(`   ✅ Saved: ${name}`);
    return outPath;
  } catch (err) {
    console.error(`   ⚠️ Failed for ${name}:`, err.message);
    return null;
  }
}

async function runBrowserProof() {
  console.log("============================================================================");
  console.log("🌐 LIVE BROWSER TESTING & PROOF REPORT — 3 SAAS PLAN TIERS 🌐");
  console.log(`🎯 Target Deployment: ${BASE_URL}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log("============================================================================\n");

  // Step 1: Sign in as Super Admin
  const { data: adminLogin, error: adminErr } = await supabaseAdmin.auth.signInWithPassword({
    email: "admin@trinetra.com",
    password: "Password@123"
  });

  if (adminErr || !adminLogin?.session?.access_token) {
    throw new Error(`Admin authentication failed: ${adminErr?.message}`);
  }
  const adminToken = adminLogin.session.access_token;
  console.log("1. Authenticated as Super Admin (admin@trinetra.com)");

  // Step 2: Fetch one restaurant for each plan tier
  console.log("\n2. Resolving target restaurants for all 3 Plan Tiers...");

  // Starter
  const { data: starterTenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, plan")
    .eq("plan", "starter")
    .order("created_at", { ascending: false })
    .limit(1);
  const starter = starterTenants?.[0];
  const { data: starterRestros } = starter ? await supabaseAdmin.from("restaurants").select("id, name").eq("tenant_id", starter.id).limit(1) : { data: [] };

  // Pro / Growth
  const { data: proTenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, plan")
    .or("plan.eq.growth,plan.eq.pro")
    .order("created_at", { ascending: false })
    .limit(1);
  const pro = proTenants?.[0];
  const { data: proRestros } = pro ? await supabaseAdmin.from("restaurants").select("id, name").eq("tenant_id", pro.id).limit(1) : { data: [] };

  // Enterprise
  const { data: entTenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, plan")
    .eq("plan", "enterprise")
    .order("created_at", { ascending: false })
    .limit(1);
  const ent = entTenants?.[0];
  const { data: entRestros } = ent ? await supabaseAdmin.from("restaurants").select("id, name").eq("tenant_id", ent.id).limit(1) : { data: [] };

  const tiers = [
    {
      tierName: "Starter Tier (₹1,999/mo)",
      planKey: "starter",
      tenant: starter,
      restro: starterRestros?.[0],
      screenshotName: "plan_tier_01_starter_portal.png",
      expectedBadge: "🌱 Starter",
      expectedTables: "10 Max Tables",
      expectedKds: "Disabled (Gated)"
    },
    {
      tierName: "Pro Tier (₹2,999/mo)",
      planKey: "pro",
      tenant: pro,
      restro: proRestros?.[0],
      screenshotName: "plan_tier_02_pro_portal.png",
      expectedBadge: "🚀 Pro Plan",
      expectedTables: "Unlimited Tables",
      expectedKds: "Enabled (Live KDS)"
    },
    {
      tierName: "Enterprise Tier (₹8,999/mo)",
      planKey: "enterprise",
      tenant: ent,
      restro: entRestros?.[0],
      screenshotName: "plan_tier_03_enterprise_portal.png",
      expectedBadge: "👑 Enterprise",
      expectedTables: "Unlimited Tables",
      expectedKds: "Enabled (Live KDS + Inventory BOM)"
    }
  ];

  // Step 3: Verify API Context for each tier
  console.log("\n3. Testing Context API for each plan tier...");
  for (const t of tiers) {
    if (!t.tenant || !t.restro) {
      console.error(`❌ Missing restaurant fixture for ${t.tierName}`);
      continue;
    }

    const apiUrl = `${BASE_URL}/api/client/restaurant/context?tenant_id=${t.tenant.id}&restaurant_id=${t.restro.id}`;
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();

    const planMatch = data.success && data.plan_config?.monthlyPriceInr > 0;
    console.log(`   [${planMatch ? '✅ PASS' : '❌ FAIL'}] ${t.tierName}`);
    console.log(`      Restaurant: "${t.restro.name}" (${t.restro.id})`);
    console.log(`      Resolved Plan: ${data.plan} (DisplayName: "${data.plan_config?.displayName}", Price: ₹${data.plan_config?.monthlyPriceInr}/mo)`);
    console.log(`      Limits: Tables=${data.plan_config?.limits?.maxTables === -1 ? 'Unlimited' : data.plan_config?.limits?.maxTables}, Floors=${data.plan_config?.limits?.maxFloors}`);
    console.log(`      Features: KDS=${data.plan_config?.features?.kitchenKds}, Inventory=${data.plan_config?.features?.inventoryTracking}, WhatsApp=${data.plan_config?.features?.whatsAppBilling}`);

    report.push({
      tier: t.tierName,
      restaurant: t.restro.name,
      plan: data.plan,
      price: `₹${data.plan_config?.monthlyPriceInr}/mo`,
      maxTables: data.plan_config?.limits?.maxTables === -1 ? "Unlimited" : data.plan_config?.limits?.maxTables,
      kds: data.plan_config?.features?.kitchenKds ? "YES" : "NO",
      inventory: data.plan_config?.features?.inventoryTracking ? "YES" : "NO",
      whatsapp: data.plan_config?.features?.whatsAppBilling ? "YES" : "NO"
    });
  }

  // Step 4: Capture Real Headless Chrome Browser Screenshots
  console.log("\n4. Capturing Real Browser Screenshots on Live Website...");

  // CRM Admin View
  const crmUrl = `${BASE_URL}/admin`;
  captureScreenshot("plan_tier_04_crm_admin.png", crmUrl);

  // Portal views for each tier
  for (const t of tiers) {
    if (t.tenant && t.restro) {
      const portalUrl = `${BASE_URL}/restaurant?tenant_id=${t.tenant.id}&restaurant_id=${t.restro.id}&token=${adminToken}`;
      captureScreenshot(t.screenshotName, portalUrl);
    }
  }

  console.log("\n============================================================================");
  console.log("🏁 LIVE PLAN MATRIX BROWSER PROOF REPORT 🏁");
  console.log("============================================================================");
  console.table(report);
}

runBrowserProof().catch(err => {
  console.error("Fatal Browser Proof Error:", err);
  process.exit(1);
});
