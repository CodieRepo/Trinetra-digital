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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SERVICE_ROLE_KEY;
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

async function runSmokeTest() {
  console.log('===============================================================');
  console.log('  MILESTONE H-8A: LIVE SMOKE TEST — STAFF ACCESS WORKFLOW');
  console.log('===============================================================');

  // Step 1: Provision a clean test restaurant for the smoke test
  const stamp = Date.now();
  const testTenantName = `Smoke Test Rest Group ${stamp}`;
  const testRestName = `The Grand Pavilion ${stamp}`;
  const testEmail = `grand_pavilion_${stamp}@trinetra.com`;
  const testPassword = `TrinetraOwner@2026!`;

  console.log(`\n[1/7] Provisioning test restaurant "${testRestName}"...`);
  const prov = await supabase.rpc('provision_restaurant_rpc', {
    p_tenant_name: testTenantName,
    p_restaurant_name: testRestName,
    p_owner_email: testEmail,
    p_owner_name: 'Pavilion Owner',
    p_restaurant_type: 'FineDining',
    p_cuisine_type: 'NorthIndian',
  });

  if (prov.error || !prov.data?.restaurant_id) {
    throw new Error('Provisioning failed: ' + (prov.error?.message || 'Unknown error'));
  }

  const testTenantId = prov.data.tenant_id;
  const testRestaurantId = prov.data.restaurant_id;

  // Step 2: Create real Supabase Auth user for the owner
  console.log(`[2/7] Authenticating real owner via Supabase Auth...`);
  const { data: authUser, error: authUserErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (authUserErr || !authUser?.user) {
    throw new Error('Failed to create auth user: ' + authUserErr?.message);
  }

  const ownerUserId = authUser.user.id;

  // Link owner user in profiles and users_roles
  await supabase.from('profiles').upsert({
    id: ownerUserId,
    username: 'PavilionOwner',
    role: 'client_admin',
    tenant_id: testTenantId,
  });

  await supabase.from('users_roles').upsert({
    user_id: ownerUserId,
    tenant_id: testTenantId,
    role: 'owner',
  });

  // Client sign in to retrieve access_token
  const clientSupabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: signInData, error: signInErr } = await clientSupabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInErr || !signInData?.session?.access_token) {
    throw new Error('Sign in failed: ' + signInErr?.message);
  }

  const accessToken = signInData.session.access_token;
  assert(!!accessToken, 'Owner successfully signed in via Supabase Auth');

  // Step 3: Verify Restaurant Context resolution
  console.log(`[3/7] Verifying Restaurant Context resolution with Bearer token...`);
  const contextRes = await fetch(`${BASE_URL}/api/client/restaurant/context?restaurant_id=${testRestaurantId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const contextJson = await contextRes.json();
  assert(
    contextRes.status === 200 && contextJson.success === true && contextJson.role === 'owner',
    'Context resolved as authenticated owner (role = "owner")'
  );

  // Step 4: Verify Staff Directory GET with Bearer token
  console.log(`[4/7] Testing GET /api/client/restaurant/staff with Bearer token...`);
  const listRes = await fetch(`${BASE_URL}/api/client/restaurant/staff?restaurant_id=${testRestaurantId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const listJson = await listRes.json();
  assert(listRes.status === 200 && Array.isArray(listJson.staff), 'Staff directory fetched successfully (HTTP 200)');

  // Step 5: Add new Staff Member (Original UI scenario that produced 401)
  console.log(`[5/7] Testing POST /api/client/restaurant/staff (Add Staff Member)...`);
  const addRes = await fetch(`${BASE_URL}/api/client/restaurant/staff?restaurant_id=${testRestaurantId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Amit Verma',
      role: 'waiter',
      restaurant_id: testRestaurantId,
    }),
  });
  const addJson = await addRes.json();
  assert(
    addRes.status === 200 && addJson.staff && addJson.staff.name === 'Amit Verma' && addJson.staff.role === 'waiter',
    'Add Staff Member succeeded without 401 Unauthorized (Amit Verma, waiter)'
  );

  const createdStaffId = addJson.staff?.id;

  // Step 6: Edit / Update Staff Member
  console.log(`[6/7] Testing PATCH /api/client/restaurant/staff (Edit & Toggle Status)...`);
  const editRes = await fetch(`${BASE_URL}/api/client/restaurant/staff?restaurant_id=${testRestaurantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      staff_id: createdStaffId,
      name: 'Amit Verma (Senior)',
      role: 'waiter',
      is_active: true,
    }),
  });
  const editJson = await editRes.json();
  assert(
    editRes.status === 200 && editJson.staff?.name === 'Amit Verma (Senior)',
    'Edit Staff Member succeeded (Amit Verma -> Amit Verma (Senior))'
  );

  // Step 7: Reset / Set Staff PIN (for active staff member)
  console.log(`[7/7] Testing POST /api/v1/auth/staff/set-pin (Set Staff PIN)...`);
  const pinRes = await fetch(`${BASE_URL}/api/v1/auth/staff/set-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      staff_id: createdStaffId,
      restaurant_id: testRestaurantId,
      pin: '5678',
    }),
  });
  const pinJson = await pinRes.json();
  assert(pinRes.status === 200 && pinJson.success === true, 'Set Staff PIN succeeded (HTTP 200)');

  // Step 8: Deactivate Staff Member
  console.log(`[8/8] Testing Deactivation of Staff Member...`);
  const deactRes = await fetch(`${BASE_URL}/api/client/restaurant/staff?restaurant_id=${testRestaurantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      staff_id: createdStaffId,
      is_active: false,
    }),
  });
  const deactJson = await deactRes.json();
  assert(
    deactRes.status === 200 && deactJson.staff?.is_active === false,
    'Deactivate Staff Member succeeded (is_active = false)'
  );

  // Step 8: Verify unauthenticated request without token is rejected
  console.log(`\n[Bonus] Verifying unauthenticated request without token is rejected...`);
  const unauthRes = await fetch(`${BASE_URL}/api/client/restaurant/staff?restaurant_id=${testRestaurantId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Hacker',
      role: 'waiter',
    }),
  });
  assert(unauthRes.status === 401, 'Unauthenticated Add Staff request strictly rejected with HTTP 401');

  // Teardown test entities
  console.log('\nCleaning up smoke test entities...');
  await supabase.from('restaurant_staff').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurant_tables').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurant_floors').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurant_profiles').delete().eq('restaurant_id', testRestaurantId);
  await supabase.from('restaurant_settings').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurant_feature_flags').delete().eq('tenant_id', testTenantId);
  await supabase.from('restaurants').delete().eq('tenant_id', testTenantId);
  await supabase.from('users_roles').delete().eq('user_id', ownerUserId);
  await supabase.from('profiles').delete().eq('id', ownerUserId);
  await supabase.from('tenants').delete().eq('id', testTenantId);
  await supabase.auth.admin.deleteUser(ownerUserId);

  console.log('\n===============================================================');
  console.log(`  LIVE SMOKE TEST RESULT: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTest().catch((err) => {
  console.error('Fatal smoke test error:', err);
  process.exit(1);
});
