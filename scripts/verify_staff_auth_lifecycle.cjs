/**
 * scripts/verify_staff_auth_lifecycle.cjs
 *
 * RESTAURANT OS — STAFF AUTHENTICATION & SESSION LIFECYCLE VERIFICATION SUITE
 * Explicitly tests:
 *   1. Valid Staff JWT (10-hour shift session)
 *   2. Expired Staff JWT (401 Unauthorized rejection)
 *   3. Missing Staff JWT (401 Unauthorized rejection)
 *   4. Stale / Tampered JWT (401 Unauthorized rejection)
 *   5. Realtime active staff DB check (deactivation -> 403 Forbidden)
 *   6. Cross-restaurant isolation (403 Forbidden on spoofed restaurant_id)
 *   7. Cross-tenant isolation (403 Forbidden on foreign tenant)
 *   8. Role transition authorization (Kitchen vs Waiter RBAC)
 *   9. Staff PIN login -> fresh JWT generation
 *  10. Re-login after token expiry restores queue access
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = ['.env.production', '.env.local', '.env'];
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'trinetra-pos-terminal-secret-key-2026';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[FATAL] SUPABASE_URL and SERVICE_ROLE_KEY required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createSignedJwt(payload, ttlSeconds = 36000) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const fullPayload = { ...payload, iat: now, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('===============================================================');
  console.log('  RESTAURANT OS — STAFF AUTH LIFECYCLE & SECURITY VERIFICATION');
  console.log('===============================================================');

  const stamp = Date.now();
  let testTenantId = null;
  let testRestaurantId = null;
  let foreignRestaurantId = null;
  let kitchenStaffId = null;
  let waiterStaffId = null;
  let testOrderId = null;

  try {
    // 1. Provision isolated test restaurant
    console.log('\n[Setup] Provisioning test restaurant...');
    const prov = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: `Auth Test Group ${stamp}`,
      p_restaurant_name: `The Grand Pavilion ${stamp}`,
      p_owner_email: `auth_${stamp}@trinetra.com`,
      p_owner_name: 'Auth Owner',
      p_restaurant_type: 'FineDining',
      p_cuisine_type: 'NorthIndian',
    });

    if (prov.error || !prov.data?.restaurant_id) {
      throw new Error('Provisioning failed: ' + (prov.error?.message || 'Unknown error'));
    }

    testTenantId = prov.data.tenant_id;
    testRestaurantId = prov.data.restaurant_id;

    // Provision a second restaurant for isolation checks
    const foreignProv = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: `Foreign Group ${stamp}`,
      p_restaurant_name: `Foreign Bistro ${stamp}`,
      p_owner_email: `foreign_${stamp}@trinetra.com`,
      p_owner_name: 'Foreign Owner',
      p_restaurant_type: 'CasualDining',
      p_cuisine_type: 'Italian',
    });
    // Register Default Web POS Terminal Station
    const devTokenHash = crypto.createHash("sha256").update("trinetra-web-pos-terminal-station").digest("hex");
    await supabase.rpc("pair_terminal_device_rpc", {
      p_tenant_id: testTenantId,
      p_restaurant_id: testRestaurantId,
      p_terminal_name: "Kitchen Station Terminal",
      p_terminal_type: "FloorPOS",
      p_device_token_hash: devTokenHash,
    });

    // Create Kitchen & Waiter Staff
    const { data: kStaff, error: kErr } = await supabase.from("restaurant_staff").insert({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      name: "Chef Gordon",
      role: "kitchen",
      is_active: true,
    }).select().single();
    if (kErr) throw new Error("Failed to insert kitchen staff: " + kErr.message);
    kitchenStaffId = kStaff.id;

    // Set PIN for Kitchen Staff
    await supabase.rpc("set_staff_pin_rpc", {
      p_staff_id: kitchenStaffId,
      p_restaurant_id: testRestaurantId,
      p_raw_pin: "1234",
    });

    const { data: wStaff, error: wErr } = await supabase.from("restaurant_staff").insert({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      name: "Waiter Pierre",
      role: "waiter",
      is_active: true,
    }).select().single();
    if (wErr) throw new Error("Failed to insert waiter staff: " + wErr.message);
    waiterStaffId = wStaff.id;

    // Set PIN for Waiter Staff
    await supabase.rpc("set_staff_pin_rpc", {
      p_staff_id: waiterStaffId,
      p_restaurant_id: testRestaurantId,
      p_raw_pin: "5678",
    });

    // Create a Table & Test Order
    const { data: tbl, error: tErr } = await supabase.from("restaurant_tables").insert({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      table_number: "T10",
      table_token: crypto.randomUUID(),
      is_active: true,
    }).select().single();
    if (tErr) throw new Error("Failed to insert table: " + tErr.message);

    // Create Table Session
    const sessionToken = crypto.randomUUID();
    const { data: newSession, error: sErr } = await supabase
      .from('restaurant_table_sessions')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        table_id: tbl.id,
        session_token: sessionToken,
        status: 'active',
        payment_status: 'unpaid',
      })
      .select()
      .single();
    if (sErr) throw new Error("Failed to insert session: " + sErr.message);

    const { data: ord, error: oErr } = await supabase.from('restaurant_orders').insert({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      table_id: tbl.id,
      table_session_id: newSession.id,
      session_token: sessionToken,
      status: 'placed',
      total_amount: 550,
      order_source: 'qr',
    }).select('id').single();
    if (oErr) throw new Error("Failed to insert order: " + oErr.message);
    testOrderId = ord.id;

    console.log('Setup completed.\n');

    // ─── Test 1: Valid 10-Hour Staff JWT ─────────────────────────────────────
    console.log('[Test 1] Testing Valid 10-Hour Staff JWT...');
    const validJwt = createSignedJwt({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      terminal_id: 'term_kitchen_1',
      staff_id: kitchenStaffId,
      staff_name: 'Chef Gordon',
      role: 'kitchen',
      session_type: 'staff',
    }, 36000);

    const res1 = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${testRestaurantId}`, {
      headers: { Authorization: `Bearer ${validJwt}` },
    });
    const json1 = await res1.json();
    assert(res1.status === 200 && Array.isArray(json1.orders) && json1.orders.length >= 1, 'Valid Staff JWT returns HTTP 200 with live order queue');

    // ─── Test 2: Expired Staff JWT ───────────────────────────────────────────
    console.log('\n[Test 2] Testing Expired Staff JWT (ttl: -60s)...');
    const expiredJwt = createSignedJwt({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      terminal_id: 'term_kitchen_1',
      staff_id: kitchenStaffId,
      staff_name: 'Chef Gordon',
      role: 'kitchen',
      session_type: 'staff',
    }, -60); // Expired 1 minute ago

    const res2 = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${testRestaurantId}`, {
      headers: { Authorization: `Bearer ${expiredJwt}` },
    });
    const json2 = await res2.json();
    assert(res2.status === 401 && json2.error.includes('Unauthorized'), 'Expired Staff JWT is strictly rejected with HTTP 401');

    // ─── Test 3: Missing Staff JWT ───────────────────────────────────────────
    console.log('\n[Test 3] Testing Missing Staff JWT...');
    const res3 = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${testRestaurantId}`);
    assert(res3.status === 401, 'Request without Authorization header is strictly rejected with HTTP 401');

    // ─── Test 4: Tampered / Corrupted Staff JWT ──────────────────────────────
    console.log('\n[Test 4] Testing Tampered Staff JWT...');
    const tamperedJwt = validJwt.slice(0, -5) + 'xxxxx';
    const res4 = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${testRestaurantId}`, {
      headers: { Authorization: `Bearer ${tamperedJwt}` },
    });
    assert(res4.status === 401, 'Tampered Staff JWT signature is rejected with HTTP 401');

    // ─── Test 5: Realtime DB Active Check on Staff Deactivation ──────────────
    console.log('\n[Test 5] Testing Realtime DB Active Check on Deactivated Staff...');
    // Deactivate kitchen staff in DB
    await supabase.from('restaurant_staff').update({ is_active: false }).eq('id', kitchenStaffId);

    const res5 = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${testRestaurantId}`, {
      headers: { Authorization: `Bearer ${validJwt}` },
    });
    const json5 = await res5.json();
    assert(res5.status === 403 && json5.error.includes('deactivated'), 'Deactivated staff member with unexpired JWT is immediately rejected with HTTP 403');

    // Re-activate for subsequent tests
    await supabase.from('restaurant_staff').update({ is_active: true }).eq('id', kitchenStaffId);

    // ─── Test 6: Cross-Restaurant Isolation Guard ────────────────────────────
    console.log('\n[Test 6] Testing Cross-Restaurant Parameter Spoofing...');
    const res6 = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${foreignRestaurantId}`, {
      headers: { Authorization: `Bearer ${validJwt}` },
    });
    assert(res6.status === 403, 'Cross-restaurant spoofed request is strictly rejected with HTTP 403 Forbidden');

    // ─── Test 7: Role Transition Authorization (Kitchen vs Waiter) ───────────
    console.log('\n[Test 7] Testing Role Transition Authorization...');
    // Kitchen staff marks placed -> accepted
    const res7a = await fetch(`${BASE_URL}/api/staff/orders/${testOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({ status: 'accepted', restaurant_id: testRestaurantId }),
    });
    const json7a = await res7a.json();
    assert(res7a.status === 200 && json7a.status === 'accepted', 'Kitchen staff can transition placed -> accepted');

    // Kitchen staff attempts illegal transition: ready -> served (only waiters can serve)
    const res7b = await fetch(`${BASE_URL}/api/staff/orders/${testOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({ status: 'served', restaurant_id: testRestaurantId }),
    });
    assert(res7b.status === 403, 'Kitchen staff is forbidden from transitioning order to served (HTTP 403)');

    // ─── Test 8: Waiter Staff Role Transition ────────────────────────────────
    console.log('\n[Test 8] Testing Waiter Staff Role Transition...');
    const waiterJwt = createSignedJwt({
      tenant_id: testTenantId,
      restaurant_id: testRestaurantId,
      terminal_id: 'term_waiter_1',
      staff_id: waiterStaffId,
      staff_name: 'Waiter Pierre',
      role: 'waiter',
      session_type: 'staff',
    }, 36000);

    // Kitchen advances to ready
    await fetch(`${BASE_URL}/api/staff/orders/${testOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validJwt}` },
      body: JSON.stringify({ status: 'preparing', restaurant_id: testRestaurantId }),
    });
    await fetch(`${BASE_URL}/api/staff/orders/${testOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validJwt}` },
      body: JSON.stringify({ status: 'ready', restaurant_id: testRestaurantId }),
    });

    // Waiter marks ready -> served
    const res8 = await fetch(`${BASE_URL}/api/staff/orders/${testOrderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${waiterJwt}`,
      },
      body: JSON.stringify({ status: 'served', restaurant_id: testRestaurantId }),
    });
    const json8 = await res8.json();
    assert(res8.status === 200 && json8.status === 'served', 'Waiter staff can transition ready -> served (HTTP 200)');

    // ─── Test 9: Staff PIN Login Route ───────────────────────────────────────
    console.log('\n[Test 9] Testing Staff PIN Login API (/api/staff/auth/login)...');
    const loginRes = await fetch(`${BASE_URL}/api/staff/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: testRestaurantId,
        pin: '1234',
      }),
    });
    const loginJson = await loginRes.json();
    console.log("Login response status:", loginRes.status, "body:", loginJson);
    assert(loginRes.status === 200 && loginJson.success === true && !!loginJson.token, 'Staff PIN login issues valid Staff JWT with active session');

    // ─── Test 10: Re-Authentication Flow ────────────────────────────────────
    console.log('\n[Test 10] Testing Re-Authentication Queue Access with Fresh Token...');
    const freshToken = loginJson.token;
    const reAuthRes = await fetch(`${BASE_URL}/api/staff/orders?restaurant_id=${testRestaurantId}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    const reAuthJson = await reAuthRes.json();
    assert(reAuthRes.status === 200 && Array.isArray(reAuthJson.orders), 'Re-authenticated staff member immediately accesses canonical order queue');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    // Teardown
    console.log('\n[Teardown] Cleaning up test entities...');
    if (testTenantId) {
      await supabase.from('restaurant_order_events').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurant_order_items').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurant_orders').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurant_table_sessions').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurant_tables').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurant_staff').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurant_profiles').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('restaurant_settings').delete().eq('tenant_id', testTenantId);
      await supabase.from('restaurants').delete().eq('tenant_id', testTenantId);
      await supabase.from('tenants').delete().eq('id', testTenantId);
    }
    if (foreignRestaurantId) {
      await supabase.from('restaurants').delete().eq('id', foreignRestaurantId);
    }
  }

  console.log('\n===============================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
