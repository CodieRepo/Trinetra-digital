const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function main() {
  console.log('===============================================================');
  console.log('  VERIFYING MILESTONE H-8A SECURITY REMEDIATIONS & COMPATIBILITY');
  console.log('===============================================================');

  // Fetch demo restaurant & demo table for testing
  const { data: demoRest } = await supabase
    .from('restaurants')
    .select('id, tenant_id, name')
    .ilike('name', '%Spice Garden%')
    .limit(1)
    .single();

  const { data: demoTable } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, table_token')
    .eq('restaurant_id', demoRest.id)
    .limit(1)
    .single();

  // Create isolated secondary restaurant and table for cross-table IDOR tests
  const stamp = Date.now();
  const prov = await supabase.rpc('provision_restaurant_rpc', {
    p_tenant_name: `H8A Tenant ${stamp}`,
    p_restaurant_name: `H8A Isolated Bistro ${stamp}`,
    p_owner_email: `h8a_owner_${stamp}@test.com`,
    p_owner_name: 'H8A Owner',
    p_restaurant_type: 'FineDining',
    p_cuisine_type: 'NorthIndian',
  });

  if (prov.error || !prov.data?.restaurant_id) {
    throw new Error('Failed to provision restB: ' + (prov.error?.message || 'Unknown error'));
  }

  const testTenantId = prov.data.tenant_id;
  const restB = { id: prov.data.restaurant_id, tenant_id: testTenantId };

  const { data: floorB } = await supabase
    .from('restaurant_floors')
    .insert({
      tenant_id: testTenantId,
      restaurant_id: restB.id,
      name: 'Main Floor',
    })
    .select('id')
    .single();

  const { data: tableB } = await supabase
    .from('restaurant_tables')
    .insert({
      tenant_id: testTenantId,
      restaurant_id: restB.id,
      floor_id: floorB.id,
      table_number: 'B-1',
      table_token: crypto.randomUUID(),
    })
    .select('id, table_token')
    .single();

  const sessionTokenA = crypto.randomUUID();
  const { data: sessionA } = await supabase
    .from('restaurant_table_sessions')
    .insert({
      tenant_id: demoRest.tenant_id,
      restaurant_id: demoRest.id,
      table_id: demoTable.id,
      session_token: sessionTokenA,
      status: 'active',
      payment_status: 'unpaid',
    })
    .select('id')
    .single();

  const sessionTokenB = crypto.randomUUID();
  const { data: sessionB } = await supabase
    .from('restaurant_table_sessions')
    .insert({
      tenant_id: testTenantId,
      restaurant_id: restB.id,
      table_id: tableB.id,
      session_token: sessionTokenB,
      status: 'active',
      payment_status: 'unpaid',
    })
    .select('id')
    .single();

  // -------------------------------------------------------------------------
  // 1-3. P0-1: /api/auth/login Hardcoded Backdoor Removal
  // -------------------------------------------------------------------------
  console.log('\n--- Testing P0-1: /api/auth/login Backdoor Removal ---');

  // Test 1: "admin" / "admin123"
  const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert(res1.status === 401, 'Assertion 1: Hardcoded credentials "admin" / "admin123" rejected with HTTP 401');

  // Test 2: "satwik" / "SatwikPal@123Shubham"
  const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'satwik', password: 'SatwikPal@123Shubham' }),
  });
  assert(res2.status === 401, 'Assertion 2: Hardcoded credentials "satwik" / "SatwikPal@123Shubham" rejected with HTTP 401');

  // Test 3: Empty credentials
  const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(res3.status === 400, 'Assertion 3: Empty login credentials rejected with HTTP 400');

  // -------------------------------------------------------------------------
  // 4-7. P0-2: /api/v1/admin/* Fail-Closed & Mock Token Removal
  // -------------------------------------------------------------------------
  console.log('\n--- Testing P0-2: /api/v1/admin/* Fail-Closed & Mock Token Removal ---');

  // Test 4: DELETE /api/v1/admin/delete-restaurant with mock token
  const res4 = await fetch(`${BASE_URL}/api/v1/admin/delete-restaurant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer trinetra-dev-jwt-token-admin-authenticated',
    },
    body: JSON.stringify({ restaurant_id: restB.id }),
  });
  assert(res4.status === 401, 'Assertion 4: DELETE /api/v1/admin/delete-restaurant with mock token rejected with HTTP 401');

  // Test 5: POST /api/v1/admin/onboard-restaurant with mock token
  const res5 = await fetch(`${BASE_URL}/api/v1/admin/onboard-restaurant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer trinetra-dev-jwt-token-admin-authenticated',
    },
    body: JSON.stringify({ restaurant_name: 'Fake Restaurant' }),
  });
  assert(res5.status === 401, 'Assertion 5: POST /api/v1/admin/onboard-restaurant with mock token rejected with HTTP 401');

  // Test 6: GET /api/v1/admin/restaurant-insights with mock token
  const res6 = await fetch(`${BASE_URL}/api/v1/admin/restaurant-insights`, {
    headers: {
      Authorization: 'Bearer trinetra-dev-jwt-token-admin-authenticated',
    },
  });
  assert(res6.status === 401, 'Assertion 6: GET /api/v1/admin/restaurant-insights with mock token rejected with HTTP 401');

  // Test 7: Unauthenticated access without headers to admin endpoints
  const res7 = await fetch(`${BASE_URL}/api/v1/admin/delete-restaurant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(res7.status === 401, 'Assertion 7: Unauthenticated access to admin endpoint strictly rejected with HTTP 401');

  // -------------------------------------------------------------------------
  // 8-10. P1-1: Scope Session Updates (IDOR Prevention)
  // -------------------------------------------------------------------------
  console.log('\n--- Testing P1-1: Strict Session-to-Table Scoping ---');

  // Test 8: Valid tableToken and valid sessionId for Table A
  const res8 = await fetch(`${BASE_URL}/api/r/${demoTable.table_token}/session/request-bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionA.id }),
  });
  assert(res8.status === 200, 'Assertion 8: Valid tableToken and sessionId request-bill succeeds with HTTP 200');

  // Test 9: Mismatched cross-table sessionId (calling Table A token with Table B's sessionId)
  const res9 = await fetch(`${BASE_URL}/api/r/${demoTable.table_token}/session/request-bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionB.id }),
  });
  assert(res9.status === 404, 'Assertion 9: Cross-table mismatched sessionId on request-bill strictly rejected with HTTP 404');

  // Test 10: Mismatched cross-table sessionId on pay endpoint
  const res10 = await fetch(`${BASE_URL}/api/r/${demoTable.table_token}/session/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionB.id,
      paymentMethod: 'upi',
      utrNumber: '999999999999',
      amount: 500,
    }),
  });
  assert(res10.status === 404, 'Assertion 10: Cross-table mismatched sessionId on pay endpoint strictly rejected with HTTP 404');

  // -------------------------------------------------------------------------
  // 11-12. P1-2: Rate Limiting Enforcement
  // -------------------------------------------------------------------------
  console.log('\n--- Testing P1-2: Rate Limiting Threshold Enforcement ---');

  // Test 11: PIN login rate limit (>30 req/min for staff PIN)
  const testIp = '10.99.88.77';
  let pin429Received = false;
  for (let i = 0; i < 35; i++) {
    const r = await fetch(`${BASE_URL}/api/v1/auth/staff/pin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({
        restaurant_id: demoRest.id,
        device_token: 'fake-device-token',
        pin: '1234',
      }),
    });
    if (r.status === 429) {
      pin429Received = true;
      break;
    }
  }
  assert(pin429Received, 'Assertion 11: Staff PIN login rate limiter enforces threshold and returns HTTP 429');

  // Test 12: QR orders rate limit (>20 req/min per table/client)
  const qrTestIp = '10.99.88.99';
  let qr429Received = false;
  for (let i = 0; i < 25; i++) {
    const r = await fetch(`${BASE_URL}/api/r/${tableB.table_token}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': qrTestIp,
      },
      body: JSON.stringify({
        session_token: sessionTokenB,
        items: [{ id: crypto.randomUUID(), name: 'Test Item', price: 100, quantity: 1 }],
      }),
    });
    if (r.status === 429) {
      qr429Received = true;
      break;
    }
  }
  assert(qr429Received, 'Assertion 12: QR order creation rate limiter enforces threshold and returns HTTP 429');

  // -------------------------------------------------------------------------
  // 13-14. Positive Tests: Real Supabase Auth & Staff Creation
  // -------------------------------------------------------------------------
  console.log('\n--- Testing Positive Tests: Real Supabase Auth & Staff Creation ---');

  // Create real test owner user in Supabase auth for verification
  const testOwnerEmail = `test.owner.${Date.now()}@trinetra.com`;
  const testOwnerPassword = 'TestOwnerSecure@2026!';
  const { data: authUser, error: authUserErr } = await supabase.auth.admin.createUser({
    email: testOwnerEmail,
    password: testOwnerPassword,
    email_confirm: true,
  });

  if (authUserErr || !authUser?.user) {
    console.error('Failed to create test owner user:', authUserErr?.message);
  }

  const ownerUserId = authUser.user.id;

  // Link owner user to restB tenant as client_admin / owner
  await supabase.from('profiles').upsert({
    id: ownerUserId,
    username: 'TestOwner',
    role: 'client_admin',
    tenant_id: testTenantId,
  });

  await supabase.from('users_roles').upsert({
    user_id: ownerUserId,
    tenant_id: testTenantId,
    role: 'owner',
  });

  // Sign in to get real Supabase JWT access_token
  const clientAuth = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: signInData, error: signInErr } = await clientAuth.auth.signInWithPassword({
    email: testOwnerEmail,
    password: testOwnerPassword,
  });

  const realToken = signInData?.session?.access_token;
  assert(!!realToken && !signInErr, 'Real Supabase Auth login generates valid access_token');

  // Test 13: Real Supabase authenticated user resolves restaurant context
  const res13 = await fetch(`${BASE_URL}/api/client/restaurant/context?restaurant_id=${restB.id}`, {
    headers: {
      Authorization: `Bearer ${realToken}`,
    },
  });
  const contextData = await res13.json();
  assert(
    res13.status === 200 && contextData.success === true && contextData.tenant_id === testTenantId,
    'Assertion 13: Real Supabase authenticated user session resolves valid restaurant context (HTTP 200)'
  );

  // Test 14: Real Supabase authenticated owner can create a staff member via POST /api/client/restaurant/staff
  const res14 = await fetch(`${BASE_URL}/api/client/restaurant/staff?restaurant_id=${restB.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${realToken}`,
    },
    body: JSON.stringify({
      name: 'Rohan Sharma',
      role: 'waiter',
      restaurant_id: restB.id,
    }),
  });
  const staffData = await res14.json();
  assert(
    res14.status === 200 && staffData.staff && staffData.staff.name === 'Rohan Sharma',
    'Assertion 14: Real Supabase authenticated owner creates Staff Member successfully without 401 Unauthorized'
  );

  // Cleanup test entities
  await supabase.from('restaurant_table_sessions').delete().in('id', [sessionA.id, sessionB.id]);
  await supabase.from('restaurant_staff').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurant_tables').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurant_floors').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurants').delete().eq('tenant_id', testTenantId);
  await supabase.from('users_roles').delete().eq('user_id', ownerUserId);
  await supabase.from('profiles').delete().eq('id', ownerUserId);
  await supabase.from('tenants').delete().eq('id', testTenantId);
  await supabase.auth.admin.deleteUser(ownerUserId);

  console.log('\n===============================================================');
  console.log(`  H-8A VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
