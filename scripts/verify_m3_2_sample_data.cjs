/**
 * Trinetra Restaurant OS — Milestone 3.2 Targeted Verification Suite
 * Verifies Wizard Step 7 Sample Menu Data Scoping, Tenant Isolation & Idempotency.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    try {
      const envPath = path.join(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
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
const BASE_URL = 'http://localhost:3001';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const DEMO_RESTAURANT_ID = 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';

function makeRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runM32Verification() {
  console.log('=========================================================================');
  console.log('MILESTONE 3.2 — STEP 7 SAMPLE MENU DATA SCOPING VERIFICATION SUITE');
  console.log('=========================================================================\n');

  const ts = Date.now();
  let restAId = null;
  let tenantAId = null;
  let restBId = null;
  let tenantBId = null;

  try {
    // --- Step 1: Provision Two Isolated Restaurants ---
    console.log('--- Step 1: Provisioning Two Isolated Restaurants ---');
    const { data: resA, error: errA } = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: `Test Tenant A ${ts}`,
      p_restaurant_name: `Test Rest A ${ts}`,
      p_owner_name: 'Owner A',
      p_owner_email: `owner_a_${ts}@test.com`,
    });
    if (errA || !resA?.restaurant_id) {
      throw new Error(`Failed to provision Restaurant A: ${errA?.message}`);
    }
    restAId = resA.restaurant_id;
    tenantAId = resA.tenant_id;
    console.log(`  ✓ Provisioned Rest A: ID=${restAId}, Tenant=${tenantAId}`);

    const { data: resB, error: errB } = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: `Test Tenant B ${ts}`,
      p_restaurant_name: `Test Rest B ${ts}`,
      p_owner_name: 'Owner B',
      p_owner_email: `owner_b_${ts}@test.com`,
    });
    if (errB || !resB?.restaurant_id) {
      throw new Error(`Failed to provision Restaurant B: ${errB?.message}`);
    }
    restBId = resB.restaurant_id;
    tenantBId = resB.tenant_id;
    console.log(`  ✓ Provisioned Rest B: ID=${restBId}, Tenant=${tenantBId}`);

    // --- Step 2: Check Initial State ---
    console.log('\n--- Step 2: Verifying Initial Menu Counts ---');
    const { count: catCountA0 } = await supabase
      .from('menu_categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restAId);
    const { count: itemCountA0 } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restAId);

    const { count: catCountB0 } = await supabase
      .from('menu_categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restBId);
    const { count: itemCountB0 } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restBId);

    const { count: catCountDemo0 } = await supabase
      .from('menu_categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', DEMO_RESTAURANT_ID);
    const { count: itemCountDemo0 } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', DEMO_RESTAURANT_ID);

    if (catCountA0 !== 0 || itemCountA0 !== 0 || catCountB0 !== 0 || itemCountB0 !== 0) {
      throw new Error(`Initial menu counts not zero: A=(${catCountA0}, ${itemCountA0}), B=(${catCountB0}, ${itemCountB0})`);
    }
    console.log('  ✅ PASS: Initial categories/items are 0 for both restaurants.');

    // --- Step 3: Execute Step 7 Sample Data Opt-in for Restaurant A via HTTP PATCH ---
    console.log('\n--- Step 3: Executing Step 7 Sample Data Opt-in via HTTP PATCH /api/restaurant-os/provisioning/wizard ---');
    const patchRes = await makeRequest('PATCH', '/api/restaurant-os/provisioning/wizard', {
      restaurantId: restAId,
      stepData: {
        step: 7,
        sampleDataOptIn: { loadSampleData: true },
      },
    });

    if (patchRes.status !== 200 || !patchRes.body?.success) {
      throw new Error(`PATCH /api/restaurant-os/provisioning/wizard failed: status=${patchRes.status}, error=${JSON.stringify(patchRes.body)}`);
    }
    console.log('  ✓ Step 7 HTTP PATCH returned 200 OK with success=true.');

    // --- Step 4: Verify Restaurant A Sample Menu Data ---
    console.log('\n--- Step 4: Verifying Restaurant A Sample Data Population ---');
    const { data: catsA, error: catsAErr } = await supabase
      .from('menu_categories')
      .select('id, tenant_id, restaurant_id, name')
      .eq('restaurant_id', restAId)
      .order('display_order', { ascending: true });

    if (catsAErr) throw new Error(`Failed to query Rest A categories: ${catsAErr.message}`);
    if (!catsA || catsA.length !== 4) {
      throw new Error(`Expected 4 categories for Restaurant A, found: ${catsA?.length}`);
    }
    console.log(`  ✅ PASS: Restaurant A received exactly 4 sample categories: ${catsA.map((c) => c.name).join(', ')}`);

    const { data: itemsA, error: itemsAErr } = await supabase
      .from('menu_items')
      .select('id, tenant_id, restaurant_id, category_id, name, price, is_veg')
      .eq('restaurant_id', restAId)
      .order('display_order', { ascending: true });

    if (itemsAErr) throw new Error(`Failed to query Rest A items: ${itemsAErr.message}`);
    if (!itemsA || itemsA.length !== 12) {
      throw new Error(`Expected 12 items for Restaurant A, found: ${itemsA?.length}`);
    }
    console.log(`  ✅ PASS: Restaurant A received exactly 12 sample menu items.`);

    // Verify all categories and items have correct tenant_id and restaurant_id
    for (const c of catsA) {
      if (c.tenant_id !== tenantAId || c.restaurant_id !== restAId) {
        throw new Error(`Category ${c.name} has incorrect tenant/restaurant scoping!`);
      }
    }
    const catAIdSet = new Set(catsA.map((c) => c.id));
    for (const item of itemsA) {
      if (item.tenant_id !== tenantAId || item.restaurant_id !== restAId) {
        throw new Error(`Item ${item.name} has incorrect tenant/restaurant scoping!`);
      }
      if (!catAIdSet.has(item.category_id)) {
        throw new Error(`Item ${item.name} category_id ${item.category_id} does not belong to Restaurant A!`);
      }
    }
    console.log('  ✅ PASS: 100% of categories and items strictly scoped to Tenant A & Restaurant A.');

    // --- Step 5: Strict Isolation Checks ---
    console.log('\n--- Step 5: Strict Tenant & Demo Isolation Checks ---');
    const { count: catCountB1 } = await supabase
      .from('menu_categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restBId);
    const { count: itemCountB1 } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restBId);

    if (catCountB1 !== 0 || itemCountB1 !== 0) {
      throw new Error(`ISOLATION BREACH: Restaurant B received menu data! categories=${catCountB1}, items=${itemCountB1}`);
    }
    console.log('  ✅ PASS: Restaurant B strictly isolated — 0 categories, 0 items.');

    const { count: catCountDemo1 } = await supabase
      .from('menu_categories')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', DEMO_RESTAURANT_ID);
    const { count: itemCountDemo1 } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', DEMO_RESTAURANT_ID);

    if (catCountDemo1 !== catCountDemo0 || itemCountDemo1 !== itemCountDemo0) {
      throw new Error(`DEMO BREACH: Showcase Demo restaurant was modified! Expected (${catCountDemo0}, ${itemCountDemo0}), got (${catCountDemo1}, ${itemCountDemo1})`);
    }
    console.log('  ✅ PASS: Showcase Demo restaurant strictly isolated — 0 unexpected modifications.');

    // --- Step 6: Idempotency Verification ---
    console.log('\n--- Step 6: Idempotency Verification (Re-running Step 7) ---');
    const patchRes2 = await makeRequest('PATCH', '/api/restaurant-os/provisioning/wizard', {
      restaurantId: restAId,
      stepData: {
        step: 7,
        sampleDataOptIn: { loadSampleData: true },
      },
    });

    if (patchRes2.status !== 200 || !patchRes2.body?.success) {
      throw new Error(`Second PATCH /api/restaurant-os/provisioning/wizard failed: status=${patchRes2.status}`);
    }

    const { data: catsA2 } = await supabase
      .from('menu_categories')
      .select('id, name')
      .eq('restaurant_id', restAId);
    const { data: itemsA2 } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('restaurant_id', restAId);

    if (catsA2.length !== 4) {
      throw new Error(`IDEMPOTENCY FAILED: Duplicate categories created! Count=${catsA2.length}`);
    }
    if (itemsA2.length !== 12) {
      throw new Error(`IDEMPOTENCY FAILED: Duplicate items created! Count=${itemsA2.length}`);
    }
    console.log('  ✅ PASS: Idempotency verified — re-running Step 7 preserves exact counts (4 categories, 12 items).');

    console.log('\n=========================================================================');
    console.log('MILESTONE 3.2 TARGETED VERIFICATION: ALL 6 ASSERTIONS PASSED ✅');
    console.log('=========================================================================\n');
  } finally {
    // --- Teardown ---
    console.log('--- Teardown: Cleaning Temporary Test Restaurants ---');
    if (restAId) {
      await supabase.from('menu_items').delete().eq('restaurant_id', restAId);
      await supabase.from('menu_categories').delete().eq('restaurant_id', restAId);
      await supabase.from('restaurant_profiles').delete().eq('restaurant_id', restAId);
      await supabase.from('restaurants').delete().eq('id', restAId);
      if (tenantAId) await supabase.from('tenants').delete().eq('id', tenantAId);
    }
    if (restBId) {
      await supabase.from('menu_items').delete().eq('restaurant_id', restBId);
      await supabase.from('menu_categories').delete().eq('restaurant_id', restBId);
      await supabase.from('restaurant_profiles').delete().eq('restaurant_id', restBId);
      await supabase.from('restaurants').delete().eq('id', restBId);
      if (tenantBId) await supabase.from('tenants').delete().eq('id', tenantBId);
    }
    console.log('  ✓ Temporary test tenants cleaned up successfully.');
  }
}

runM32Verification().catch((err) => {
  console.error('\n❌ Milestone 3.2 Verification Failed:', err);
  process.exit(1);
});
