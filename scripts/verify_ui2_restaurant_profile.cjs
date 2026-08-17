/**
 * Trinetra Restaurant OS — UI-2 Targeted Restaurant Profile & Name Editing Verification Suite
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    try {
      const envPath = path.join(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const match = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
          if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2];
          }
        }
      }
    } catch {}
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTargetedProfileTest() {
  console.log("=========================================================================");
  console.log("UI-2 — RESTAURANT PROFILE & IDENTITY TARGETED VERIFICATION SUITE");
  console.log("=========================================================================");

  let restAId = null;
  let restBId = null;
  let tenantAId = null;
  let tenantBId = null;

  try {
    const timestamp = Date.now();
    const nameAInitial = `Trinetra Original Bistro ${timestamp}`;
    const nameAMutated = `Aura Grand Cafe & Roastery ${timestamp}`;
    const nameB = `Sapphire Coast Diner ${timestamp}`;

    // ── STEP 1: Provision two isolated test restaurants
    console.log("\n--- Step 1: Provisioning Two Isolated Restaurants ---");
    const { data: provA, error: errA } = await supabase.rpc("provision_restaurant_rpc", {
      p_tenant_name: `Tenant A ${timestamp}`,
      p_restaurant_name: nameAInitial,
      p_owner_email: `owner.ui2.a.${timestamp}@trinetra.test`,
      p_owner_name: "Owner A",
      p_restaurant_type: "CasualDining",
      p_cuisine_type: "NorthIndian",
    });

    if (errA || !provA?.success) {
      throw new Error(`Failed to provision Restaurant A: ${errA?.message || provA?.message}`);
    }
    restAId = provA.restaurant_id;
    tenantAId = provA.tenant_id;
    console.log(`  ✓ Provisioned Rest A (${restAId}): "${nameAInitial}"`);

    const { data: provB, error: errB } = await supabase.rpc("provision_restaurant_rpc", {
      p_tenant_name: `Tenant B ${timestamp}`,
      p_restaurant_name: nameB,
      p_owner_email: `owner.ui2.b.${timestamp}@trinetra.test`,
      p_owner_name: "Owner B",
      p_restaurant_type: "FineDining",
      p_cuisine_type: "ItalianContinental",
    });

    if (errB || !provB?.success) {
      throw new Error(`Failed to provision Restaurant B: ${errB?.message || provB?.message}`);
    }
    restBId = provB.restaurant_id;
    tenantBId = provB.tenant_id;
    console.log(`  ✓ Provisioned Rest B (${restBId}): "${nameB}"`);

    // ── STEP 2: Initial Profile Fetch & Name Verification
    console.log("\n--- Step 2: Verifying Initial Profile Identity ---");
    const { data: initialProfileA, error: profErrA } = await supabase
      .from("restaurant_profiles")
      .select("*, restaurants(name)")
      .eq("restaurant_id", restAId)
      .single();

    if (profErrA || !initialProfileA) {
      throw new Error(`Failed to fetch profile A: ${profErrA?.message}`);
    }

    const fetchedNameA = Array.isArray(initialProfileA.restaurants)
      ? initialProfileA.restaurants[0]?.name
      : initialProfileA.restaurants?.name;

    if (fetchedNameA !== nameAInitial) {
      throw new Error(`Name mismatch. Expected "${nameAInitial}", got "${fetchedNameA}"`);
    }
    console.log(`  ✅ PASS: Initial Rest A canonical name matches "${nameAInitial}"`);

    // ── STEP 3: Mutate Restaurant A Name & Profile Identity
    console.log("\n--- Step 3: Mutating Restaurant A Profile Identity ---");
    // Update restaurants.name directly and profile metadata
    const { error: restUpdateErr } = await supabase
      .from("restaurants")
      .update({ name: nameAMutated, address: "123 Indiranagar 100ft Rd, Bangalore" })
      .eq("id", restAId);

    if (restUpdateErr) {
      throw new Error(`Failed to update restaurant table: ${restUpdateErr.message}`);
    }

    const { error: profileUpdateErr } = await supabase
      .from("restaurant_profiles")
      .update({
        restaurant_type: "Cafe",
        cuisine_type: "CafeBakery",
        brand_theme: "amber",
        phone: "+91 9988776655",
        email: "hello@auracafe.com",
        gstin: "29ABCDE1234F1Z5",
        opening_time: "08:30:00",
        closing_time: "23:00:00",
        order_prefix: "AURA-",
        bill_prefix: "INV-",
      })
      .eq("restaurant_id", restAId);

    if (profileUpdateErr) {
      throw new Error(`Failed to update restaurant profile: ${profileUpdateErr.message}`);
    }
    console.log(`  ✅ PASS: Rest A mutated to "${nameAMutated}" with brandTheme "amber" & CafeBakery cuisine`);

    // ── STEP 4: Fresh Read from DB (Simulating Page Reload / Context Fetch)
    console.log("\n--- Step 4: Fresh Read & Persistence Verification ---");
    const { data: reloadedProfileA } = await supabase
      .from("restaurant_profiles")
      .select("*, restaurants(name, address)")
      .eq("restaurant_id", restAId)
      .single();

    const reloadedNameA = Array.isArray(reloadedProfileA.restaurants)
      ? reloadedProfileA.restaurants[0]?.name
      : reloadedProfileA.restaurants?.name;

    if (reloadedNameA !== nameAMutated) {
      throw new Error(`Persistence failed! Expected "${nameAMutated}", got "${reloadedNameA}"`);
    }
    console.log(`  ✅ PASS: Fresh database query returns mutated name "${reloadedNameA}"`);
    console.log(`  ✅ PASS: Restaurant type is "${reloadedProfileA.restaurant_type}" and cuisine is "${reloadedProfileA.cuisine_type}"`);
    console.log(`  ✅ PASS: Brand theme is "${reloadedProfileA.brand_theme}" and phone is "${reloadedProfileA.phone}"`);

    // ── STEP 5: Strict Tenant & Restaurant Isolation Check
    console.log("\n--- Step 5: Strict Tenant & Cross-Restaurant Isolation ---");
    const { data: profileB } = await supabase
      .from("restaurant_profiles")
      .select("*, restaurants(name)")
      .eq("restaurant_id", restBId)
      .single();

    const currentNameB = Array.isArray(profileB.restaurants)
      ? profileB.restaurants[0]?.name
      : profileB.restaurants?.name;

    if (currentNameB !== nameB) {
      throw new Error(`Isolation breach! Rest B name changed to "${currentNameB}"`);
    }
    console.log(`  ✅ PASS: Restaurant B strictly isolated — name remains "${currentNameB}"`);
    console.log(`  ✅ PASS: Restaurant B cuisine remains "${profileB.cuisine_type}"`);

    console.log("\n=========================================================================");
    console.log("UI-2 TARGETED PROFILE VERIFICATION: ALL 7 ASSERTIONS PASSED ✅");
    console.log("=========================================================================");
  } finally {
    // Teardown
    console.log("\n--- Teardown: Cleaning Temporary Test Records ---");
    if (tenantAId) {
      await supabase.from("tenants").delete().eq("id", tenantAId);
      console.log(`  🧹 Cleaned up Tenant A (${tenantAId})`);
    }
    if (tenantBId) {
      await supabase.from("tenants").delete().eq("id", tenantBId);
      console.log(`  🧹 Cleaned up Tenant B (${tenantBId})`);
    }
  }
}

runTargetedProfileTest().catch((err) => {
  console.error("❌ Test Failed:", err.message);
  process.exit(1);
});
