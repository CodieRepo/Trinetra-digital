import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { getPlanConfig, isFeatureAllowed } from "../src/lib/plans/features.ts";

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

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const results = [];

function check(name, condition, details = "") {
  const pass = Boolean(condition);
  console.log(`[${pass ? "✅ PASS" : "❌ FAIL"}] ${name}`);
  if (details) console.log(`   ${details}`);
  results.push({ name, pass, details });
  if (!pass) throw new Error(`Assertion failed: ${name}`);
}

async function runPlanMatrixTests() {
  console.log("============================================================================");
  console.log("🧪 TRINETRA RESTAURANT OS — 3-TIER SAAS PLAN MATRIX VERIFICATION SUITE 🧪");
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log("============================================================================\n");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: Unit & Specification Verification
  // ───────────────────────────────────────────────────────────────────────────
  console.log("1. Verifying Canonical Plan Definitions in src/lib/plans/features.ts...");

  const starter = getPlanConfig("starter");
  check("Starter Tier Pricing", starter.monthlyPriceInr === 1999, `Price: ₹${starter.monthlyPriceInr}`);
  check("Starter Max Tables Limit", starter.limits.maxTables === 10, `Max Tables: ${starter.limits.maxTables}`);
  check("Starter Max Floors Limit", starter.limits.maxFloors === 1, `Max Floors: ${starter.limits.maxFloors}`);
  check("Starter KDS Disabled", starter.features.kitchenKds === false, "Kitchen KDS is gated in Starter");
  check("Starter POS Allowed", starter.features.waiterPos === true, "Mobile POS is allowed");
  check("Starter Inventory Gated", starter.features.inventoryTracking === false, "Inventory is gated in Starter");

  const pro = getPlanConfig("pro");
  check("Pro Tier Pricing", pro.monthlyPriceInr === 2999, `Price: ₹${pro.monthlyPriceInr}`);
  check("Pro Tables Unlimited", pro.limits.maxTables === -1, "Tables: Unlimited (-1)");
  check("Pro Kitchen KDS Enabled", pro.features.kitchenKds === true, "Kitchen KDS unlocked in Pro");
  check("Pro Multi-Floor Enabled", pro.features.multiFloors === true, "Multi-Floor unlocked in Pro");
  check("Pro Inventory Gated", pro.features.inventoryTracking === false, "Raw Inventory is gated in Pro");

  const enterprise = getPlanConfig("enterprise");
  check("Enterprise Tier Pricing", enterprise.monthlyPriceInr === 8999, `Price: ₹${enterprise.monthlyPriceInr}`);
  check("Enterprise Kitchen KDS Enabled", enterprise.features.kitchenKds === true, "Kitchen KDS unlocked");
  check("Enterprise Inventory Enabled", enterprise.features.inventoryTracking === true, "Inventory unlocked");
  check("Enterprise Recipe BOM Enabled", enterprise.features.recipeBOM === true, "Recipe BOM auto-deduction unlocked");
  check("Enterprise WhatsApp Billing Enabled", enterprise.features.whatsAppBilling === true, "WhatsApp billing unlocked");

  check("Feature Helper Gating Starter vs Pro", isFeatureAllowed("starter", "kitchenKds") === false && isFeatureAllowed("pro", "kitchenKds") === true);
  check("Feature Helper Gating Pro vs Enterprise", isFeatureAllowed("pro", "inventoryTracking") === false && isFeatureAllowed("enterprise", "inventoryTracking") === true);

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: Database Schema & Tenant Persistence
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n2. Verifying Tenant Plan Persistence in Supabase DB...");

  // Fetch verified tenants created recently
  const { data: sampleTenants, error: tenantErr } = await db
    .from("tenants")
    .select("id, name, plan")
    .order("created_at", { ascending: false })
    .limit(5);

  check("Database Tenants Accessible", !tenantErr && sampleTenants.length > 0, `Found ${sampleTenants?.length} recent tenants`);
  
  for (const t of sampleTenants) {
    const config = getPlanConfig(t.plan);
    console.log(`   Tenant "${t.name}" -> Plan: [${t.plan || 'none'}] -> Resolved: ${config.displayName} (₹${config.monthlyPriceInr}/mo, Tables: ${config.limits.maxTables === -1 ? 'Unlimited' : config.limits.maxTables})`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: End-to-End Onboarding with Specific Plan Tier
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n3. Testing End-to-End Onboarding with Plan Tier Assignment...");

  // Sign in as Super Admin to get token
  const { data: adminLogin, error: adminErr } = await db.auth.signInWithPassword({
    email: "admin@trinetra.com",
    password: "Password@123"
  });
  check("Super Admin Authentication", !adminErr && adminLogin.session?.access_token, "Acquired Super Admin token");
  const adminToken = adminLogin.session.access_token;

  // Provision a Starter restaurant
  const runId = Math.floor(1000 + Math.random() * 9000);
  const starterName = `Starter Bistro ${runId}`;
  const starterEmail = `starter_${runId}@test123.com`;

  const starterRes = await fetch(`${BASE_URL}/api/v1/admin/onboard-restaurant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      restaurant_name: starterName,
      owner_name: `Starter Owner ${runId}`,
      email: starterEmail,
      phone: "+919876543210",
      password: "Password@123",
      plan: "starter",
      city: "Gorakhpur",
      address: "Golghar, Gorakhpur"
    })
  });
  const starterData = await starterRes.json();
  check("Starter Restaurant Provisioned via API", starterRes.ok && starterData.success, `Restro ID: ${starterData.restaurant_id}`);

  // Verify the tenant in DB has plan = 'starter'
  const { data: starterTenant } = await db
    .from("tenants")
    .select("id, name, plan")
    .eq("id", starterData.tenant_id)
    .single();
  check("Tenant Plan Persisted as 'starter'", starterTenant?.plan === "starter", `Tenant ID: ${starterTenant.id}, Plan: ${starterTenant.plan}`);

  // Provision an Enterprise restaurant
  const entName = `Enterprise Lounge ${runId}`;
  const entEmail = `enterprise_${runId}@test123.com`;

  const entRes = await fetch(`${BASE_URL}/api/v1/admin/onboard-restaurant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      restaurant_name: entName,
      owner_name: `Enterprise Owner ${runId}`,
      email: entEmail,
      phone: "+919876543210",
      password: "Password@123",
      plan: "enterprise",
      city: "Gorakhpur",
      address: "Civil Lines, Gorakhpur"
    })
  });
  const entData = await entRes.json();
  check("Enterprise Restaurant Provisioned via API", entRes.ok && entData.success, `Restro ID: ${entData.restaurant_id}`);

  // Verify the tenant in DB has plan = 'enterprise'
  const { data: entTenant } = await db
    .from("tenants")
    .select("id, name, plan")
    .eq("id", entData.tenant_id)
    .single();
  check("Tenant Plan Persisted as 'enterprise'", entTenant?.plan === "enterprise", `Tenant ID: ${entTenant.id}, Plan: ${entTenant.plan}`);

  console.log("\n============================================================================");
  console.log("🏁 ALL PLAN MATRIX VERIFICATIONS PASSED WITH 100% SUCCESS! 🏁");
  console.log("============================================================================");
  console.table(results);
}

runPlanMatrixTests().catch(err => {
  console.error("Fatal Test Failure:", err);
  process.exit(1);
});
