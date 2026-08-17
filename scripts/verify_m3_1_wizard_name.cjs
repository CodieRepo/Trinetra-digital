/**
 * Trinetra Restaurant OS — Milestone 3.1 Verification Script
 * Validates the fix for Wizard Step 1 restaurantName mapping and full lifecycle:
 * 1. PostgREST relational query returns canonical restaurants.name as restaurantName.
 * 2. All existing RestaurantProfile fields are preserved without regression.
 * 3. Step 1 name update mutates public.restaurants.name and re-fetching returns the updated name.
 * 4. Cleanup of all temporary verification data.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = match[2] ? match[2].trim() : '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

let passCount = 0;
let failCount = 0;

function assert(condition, description, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    if (detail) console.error(`     Detail: ${JSON.stringify(detail, null, 2)}`);
    failCount++;
  }
}

async function runVerification() {
  console.log('\n===============================================================');
  console.log('🧪 MILESTONE 3.1 TARGETED VERIFICATION: WIZARD RESTAURANT NAME');
  console.log('===============================================================\n');

  let testTenantId = null;
  let testRestaurantId = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Check existing demo restaurant profile resolution
    // -------------------------------------------------------------
    console.log('--- Test Suite 1: Canonical Demo Restaurant Profile ---');
    const demoRestId = 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';

    // Ensure demo restaurant is seeded
    const { data: seedRes, error: seedErr } = await adminClient.rpc('seed_demo_restaurant_rpc');
    assert(!seedErr && seedRes && seedRes.success, 'seed_demo_restaurant_rpc executes successfully', seedErr);

    const { data: demoProfile, error: demoErr } = await adminClient
      .from('restaurant_profiles')
      .select('*, restaurants(name)')
      .eq('restaurant_id', demoRestId)
      .single();

    assert(!demoErr, 'PostgREST query with restaurants(name) executes without error', demoErr);
    assert(demoProfile !== null, 'Demo restaurant profile exists', demoProfile);

    const demoRestName = Array.isArray(demoProfile?.restaurants)
      ? demoProfile.restaurants[0]?.name
      : demoProfile?.restaurants?.name;

    assert(
      demoRestName === 'Spice Garden Fine Dining',
      `Demo restaurantName correctly resolved to "Spice Garden Fine Dining" (got "${demoRestName}")`,
      demoRestName
    );

    // Verify all canonical profile fields are present
    const requiredFields = [
      'restaurant_id',
      'tenant_id',
      'status',
      'wizard_step',
      'wizard_completed',
      'restaurant_type',
      'cuisine_type',
      'brand_theme',
      'timezone',
      'order_prefix',
      'bill_prefix',
      'opening_time',
      'closing_time',
      'fiscal_start_month',
    ];

    const missingFields = requiredFields.filter((f) => demoProfile && demoProfile[f] === undefined);
    assert(
      missingFields.length === 0,
      'All 14 standard RestaurantProfile fields are preserved without omission',
      missingFields
    );

    // -------------------------------------------------------------
    // Test 2: Provision a new test restaurant and verify name mapping
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 2: New Restaurant Provisioning & Name Resolution ---');
    const testRestName = 'Verification Royal Bistro ' + Date.now();
    const testTenantName = 'Verification Group ' + Date.now();

    const { data: provResult, error: provErr } = await adminClient.rpc('provision_restaurant_rpc', {
      p_tenant_name: testTenantName,
      p_restaurant_name: testRestName,
      p_owner_email: 'owner@verification.com',
      p_owner_name: 'Verification Owner',
      p_restaurant_type: 'CasualDining',
      p_cuisine_type: 'NorthIndian',
    });

    assert(!provErr && provResult && provResult.success, 'provision_restaurant_rpc succeeds', provErr);

    testTenantId = provResult?.tenant_id;
    testRestaurantId = provResult?.restaurant_id;

    console.log(`  ℹ️ Created temporary restaurant: ${testRestaurantId}`);

    // Query profile with join
    const { data: newProfile, error: newProfileErr } = await adminClient
      .from('restaurant_profiles')
      .select('*, restaurants(name)')
      .eq('restaurant_id', testRestaurantId)
      .single();

    assert(!newProfileErr, 'Fetch new profile with restaurants(name) succeeds', newProfileErr);

    const resolvedNewName = Array.isArray(newProfile?.restaurants)
      ? newProfile.restaurants[0]?.name
      : newProfile?.restaurants?.name;

    assert(
      resolvedNewName === testRestName,
      `Resolved restaurantName equals provisioned name "${testRestName}" (cuisineType was "${newProfile?.cuisine_type}")`,
      { resolvedNewName, expected: testRestName, cuisineType: newProfile?.cuisine_type }
    );

    assert(
      resolvedNewName !== newProfile?.cuisine_type,
      'restaurantName is strictly distinct from cuisineType',
      { resolvedNewName, cuisineType: newProfile?.cuisine_type }
    );

    // -------------------------------------------------------------
    // Test 3: Save / Resume lifecycle test (Simulating Step 1 Update)
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 3: Save & Resume Lifecycle (Step 1 Name Mutation) ---');
    const updatedName = 'Updated Crown Bistro ' + Date.now();

    // 3A: Update restaurants table (as done by ProvisioningService.updateWizardStep)
    const { error: updateRestErr } = await adminClient
      .from('restaurants')
      .update({ name: updatedName })
      .eq('id', testRestaurantId);

    assert(!updateRestErr, 'Updating restaurants.name succeeds', updateRestErr);

    // 3B: Update wizard step metadata
    const { error: updateProfileErr } = await adminClient
      .from('restaurant_profiles')
      .update({
        wizard_step: 2,
        restaurant_type: 'FineDining',
        cuisine_type: 'PanAsian',
        updated_at: new Date().toISOString(),
      })
      .eq('restaurant_id', testRestaurantId);

    assert(!updateProfileErr, 'Updating restaurant_profiles succeeds', updateProfileErr);

    // 3C: Simulate wizard resume / re-fetch
    const { data: resumedProfile, error: resumeErr } = await adminClient
      .from('restaurant_profiles')
      .select('*, restaurants(name)')
      .eq('restaurant_id', testRestaurantId)
      .single();

    assert(!resumeErr, 'Resumed profile fetch succeeds', resumeErr);

    const resumedName = Array.isArray(resumedProfile?.restaurants)
      ? resumedProfile.restaurants[0]?.name
      : resumedProfile?.restaurants?.name;

    assert(
      resumedName === updatedName,
      `Resumed restaurantName matches updated name "${updatedName}" (not "${resumedProfile?.cuisine_type}")`,
      { resumedName, updatedName }
    );

    assert(
      resumedProfile?.wizard_step === 2,
      'Wizard step advanced to 2 upon save',
      resumedProfile?.wizard_step
    );
  } finally {
    // -------------------------------------------------------------
    // Cleanup: Purge temporary verification tenant
    // -------------------------------------------------------------
    if (testTenantId) {
      console.log('\n--- Teardown: Cleaning Temporary Test Tenant ---');
      await adminClient.from('restaurant_staff_pins').delete().eq('restaurant_id', testRestaurantId);
      await adminClient.from('provisioning_audit_events').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurant_tables').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurant_floors').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurant_staff').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurant_settings').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurant_feature_flags').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurant_profiles').delete().eq('tenant_id', testTenantId);
      await adminClient.from('restaurants').delete().eq('tenant_id', testTenantId);
      await adminClient.from('tenants').delete().eq('id', testTenantId);
      console.log(`  🧹 Cleaned up tenant: ${testTenantId}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('❌ Unhandled Exception during verification:', err);
  process.exit(1);
});
