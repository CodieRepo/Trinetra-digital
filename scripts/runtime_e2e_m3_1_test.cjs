/**
 * Trinetra Restaurant OS — Milestone 3.1 Runtime & Integration Verification Suite
 * Executes end-to-end HTTP tests against the active Next.js server on port 3001:
 * 1. Provision two distinct test restaurants (isolation test).
 * 2. Verify GET /api/restaurant-os/provisioning/wizard returns canonical name for Restaurant A.
 * 3. Verify GET /api/restaurant-os/provisioning/wizard returns canonical name for Restaurant B.
 * 4. Verify SSR wizard page (/restaurant-os/provisioning/wizard?restaurantId=...) loads cleanly (HTTP 200).
 * 5. Update Step 1 restaurant name via PATCH /api/restaurant-os/provisioning/wizard.
 * 6. Simulate fresh page reload / resume: GET wizard profile and assert mutated name is restored.
 * 7. Assert Restaurant B was completely unaffected by Restaurant A mutations (tenant isolation).
 * 8. Test error handling (missing restaurantId -> 400, invalid restaurantId -> 404).
 * 9. Clean up all temporary test records.
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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
const BASE_URL = 'http://localhost:3001';

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

async function runRuntimeE2E() {
  console.log('\n===============================================================');
  console.log('🌐 MILESTONE 3.1 RUNTIME / INTEGRATION VERIFICATION (HTTP E2E)');
  console.log('===============================================================\n');

  let tenantA = null;
  let restA = null;
  let tenantB = null;
  let restB = null;

  try {
    // -------------------------------------------------------------
    // Step 1: Provision Restaurant A and Restaurant B
    // -------------------------------------------------------------
    console.log('--- Step 1: Provisioning Two Isolated Test Restaurants ---');
    const nameA = 'Amber Grill & Bistro ' + Date.now();
    const nameB = 'Blue Lagoon Seaside Cafe ' + Date.now();

    const provA = await adminClient.rpc('provision_restaurant_rpc', {
      p_tenant_name: 'Amber Group ' + Date.now(),
      p_restaurant_name: nameA,
      p_owner_email: 'owner@ambergrill.com',
      p_owner_name: 'Amber Owner',
      p_restaurant_type: 'FineDining',
      p_cuisine_type: 'NorthIndian',
    });
    assert(provA.data?.success, 'Provision Restaurant A succeeds', provA.error);
    tenantA = provA.data?.tenant_id;
    restA = provA.data?.restaurant_id;

    const provB = await adminClient.rpc('provision_restaurant_rpc', {
      p_tenant_name: 'Blue Lagoon Group ' + Date.now(),
      p_restaurant_name: nameB,
      p_owner_email: 'owner@bluelagoon.com',
      p_owner_name: 'Lagoon Owner',
      p_restaurant_type: 'Cafe',
      p_cuisine_type: 'Continental',
    });
    assert(provB.data?.success, 'Provision Restaurant B succeeds', provB.error);
    tenantB = provB.data?.tenant_id;
    restB = provB.data?.restaurant_id;

    console.log(`  ℹ️ Rest A: ${restA} ("${nameA}")`);
    console.log(`  ℹ️ Rest B: ${restB} ("${nameB}")`);

    // -------------------------------------------------------------
    // Step 2: HTTP GET Wizard API for Restaurant A
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Runtime HTTP GET /api/restaurant-os/provisioning/wizard (Restaurant A) ---');
    const resA = await makeRequest('GET', `/api/restaurant-os/provisioning/wizard?restaurantId=${restA}`);
    assert(resA.status === 200, 'HTTP 200 OK returned for Restaurant A', resA.status);
    assert(resA.body?.success === true, 'Response indicates success: true', resA.body);
    assert(
      resA.body?.data?.restaurantName === nameA,
      `data.restaurantName matches canonical name "${nameA}" (not "${resA.body?.data?.cuisineType}")`,
      resA.body?.data?.restaurantName
    );
    assert(
      resA.body?.data?.cuisineType === 'NorthIndian',
      'data.cuisineType remains uncorrupted ("NorthIndian")',
      resA.body?.data?.cuisineType
    );

    // -------------------------------------------------------------
    // Step 3: HTTP GET Wizard API for Restaurant B & Isolation Check
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Runtime HTTP GET /api/restaurant-os/provisioning/wizard (Restaurant B Isolation) ---');
    const resB = await makeRequest('GET', `/api/restaurant-os/provisioning/wizard?restaurantId=${restB}`);
    assert(resB.status === 200, 'HTTP 200 OK returned for Restaurant B', resB.status);
    assert(
      resB.body?.data?.restaurantName === nameB,
      `Restaurant B restaurantName equals "${nameB}"`,
      resB.body?.data?.restaurantName
    );
    assert(
      resB.body?.data?.restaurantName !== resA.body?.data?.restaurantName,
      'Strict Tenant Isolation: Restaurant B name is completely separate from Restaurant A',
      { nameA: resA.body?.data?.restaurantName, nameB: resB.body?.data?.restaurantName }
    );

    // -------------------------------------------------------------
    // Step 4: HTTP GET SSR Setup Wizard Page
    // -------------------------------------------------------------
    console.log('\n--- Step 4: SSR Wizard Page Render (/restaurant-os/provisioning/wizard) ---');
    const pageRes = await makeRequest('GET', `/restaurant-os/provisioning/wizard?restaurantId=${restA}`);
    assert(pageRes.status === 200, 'SSR Wizard Page returns HTTP 200 OK', pageRes.status);
    assert(
      typeof pageRes.body === 'string' && pageRes.body.includes('<!DOCTYPE html>'),
      'SSR Page delivers valid HTML markup',
      pageRes.status
    );

    // -------------------------------------------------------------
    // Step 5: Mutate Step 1 Name via HTTP PATCH
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Runtime HTTP PATCH Step 1 Mutation ---');
    const updatedNameA = 'Amber Grand Bistro & Bar ' + Date.now();
    const patchPayload = {
      restaurantId: restA,
      stepData: {
        step: 1,
        restaurantIdentity: {
          restaurantName: updatedNameA,
          restaurantType: 'FineDining',
          cuisineType: 'NorthIndian',
          brandTheme: 'emerald',
        },
      },
    };

    const patchRes = await makeRequest('PATCH', '/api/restaurant-os/provisioning/wizard', patchPayload);
    assert(patchRes.status === 200, 'HTTP 200 OK returned on PATCH', patchRes.status);
    assert(patchRes.body?.success === true, 'PATCH response indicates success: true', patchRes.body);
    assert(
      patchRes.body?.data?.restaurantName === updatedNameA,
      `PATCH response returns mutated restaurantName "${updatedNameA}"`,
      patchRes.body?.data?.restaurantName
    );
    assert(
      patchRes.body?.data?.brandTheme === 'emerald',
      'PATCH response returns updated brandTheme "emerald"',
      patchRes.body?.data?.brandTheme
    );

    // -------------------------------------------------------------
    // Step 6: Simulate Reload / Resume — Re-fetch from Backend
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Reload / Resume Verification (Backend Fresh Read) ---');
    const reloadRes = await makeRequest('GET', `/api/restaurant-os/provisioning/wizard?restaurantId=${restA}`);
    assert(reloadRes.status === 200, 'HTTP 200 OK on fresh wizard reload', reloadRes.status);
    assert(
      reloadRes.body?.data?.restaurantName === updatedNameA,
      `Fresh reload restores mutated name "${updatedNameA}"`,
      reloadRes.body?.data?.restaurantName
    );
    assert(
      reloadRes.body?.data?.brandTheme === 'emerald',
      'Fresh reload preserves brandTheme "emerald"',
      reloadRes.body?.data?.brandTheme
    );

    // Check Restaurant B is still untouched
    const reloadResB = await makeRequest('GET', `/api/restaurant-os/provisioning/wizard?restaurantId=${restB}`);
    assert(
      reloadResB.body?.data?.restaurantName === nameB,
      `Restaurant B remains strictly untouched ("${nameB}") after Restaurant A mutation`,
      reloadResB.body?.data?.restaurantName
    );

    // -------------------------------------------------------------
    // Step 7: Error & Edge Case Handling
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Error & Fallback Edge Cases ---');
    const missingParamRes = await makeRequest('GET', '/api/restaurant-os/provisioning/wizard');
    assert(missingParamRes.status === 400, 'Missing restaurantId returns HTTP 400 Bad Request', missingParamRes.status);
    assert(
      missingParamRes.body?.error?.includes('restaurantId'),
      'Error message clearly explains missing restaurantId',
      missingParamRes.body
    );

    const nonExistentId = '00000000-0000-0000-0000-000000000999';
    const notFoundRes = await makeRequest('GET', `/api/restaurant-os/provisioning/wizard?restaurantId=${nonExistentId}`);
    assert(notFoundRes.status === 404, 'Non-existent restaurantId returns HTTP 404 Not Found', notFoundRes.status);
  } finally {
    // -------------------------------------------------------------
    // Teardown: Clean up temporary test restaurants
    // -------------------------------------------------------------
    console.log('\n--- Teardown: Cleaning Temporary Test Restaurants ---');
    for (const t of [tenantA, tenantB]) {
      if (t) {
        await adminClient.from('restaurant_staff_pins').delete().eq('tenant_id', t);
        await adminClient.from('provisioning_audit_events').delete().eq('tenant_id', t);
        await adminClient.from('restaurant_tables').delete().eq('tenant_id', t);
        await adminClient.from('restaurant_floors').delete().eq('tenant_id', t);
        await adminClient.from('restaurant_staff').delete().eq('tenant_id', t);
        await adminClient.from('restaurant_settings').delete().eq('tenant_id', t);
        await adminClient.from('restaurant_feature_flags').delete().eq('tenant_id', t);
        await adminClient.from('restaurant_profiles').delete().eq('tenant_id', t);
        await adminClient.from('restaurants').delete().eq('tenant_id', t);
        await adminClient.from('tenants').delete().eq('id', t);
        console.log(`  🧹 Cleaned up tenant: ${t}`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log(`RUNTIME E2E SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runRuntimeE2E().catch((err) => {
  console.error('❌ Unhandled Exception during runtime verification:', err);
  process.exit(1);
});
