const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ── Environment Loading ─────────────────────────────────────────────────────
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS ${String(passedAssertions).padStart(2, '0')}] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

function makeRequest(urlPath, options = {}) {
  return new Promise((resolve) => {
    const fullUrl = new URL(urlPath, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(fullUrl, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, data: { error: err.message } });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  RESTAURANT OS — H-5A CUSTOMER QR & DIGITAL MENU VERIFICATION');
  console.log(`  Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  const stamp = Date.now();
  let testTenantId = null;
  let testRestaurantId = null;
  const testTableToken = crypto.randomUUID();
  const inactiveTableToken = crypto.randomUUID();

  let createdFloorId = null;
  let createdTableId = null;
  let createdInactiveTableId = null;
  let createdCategoryId = null;
  let createdAvailableItemId = null;
  let createdSoldOutItemId = null;
  let createdSessionId = null;
  let createdOrderId = null;

  try {
    // ── Phase 0: Provision isolated test entities ──
    console.log('--- Phase 0: Setup Isolated Test Fixtures ---');

    // 1. Create Restaurant using provision_restaurant_rpc
    const prov = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: `H5 Customer Group ${stamp}`,
      p_restaurant_name: `Spice Garden H5 ${stamp}`,
      p_owner_email: `customer_h5_${stamp}@test.com`,
      p_owner_name: 'H5 Customer Tester',
      p_restaurant_type: 'FineDining',
      p_cuisine_type: 'NorthIndian',
    });

    if (prov.error || !prov.data?.restaurant_id) {
      throw new Error('Failed to provision test restaurant: ' + (prov.error?.message || 'Unknown error'));
    }

    testRestaurantId = prov.data.restaurant_id;
    testTenantId = prov.data.tenant_id;

    // 2. Create Floor
    const { data: floor } = await supabase
      .from('restaurant_floors')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        name: 'Terrace Garden',
        display_order: 1,
      })
      .select('id')
      .single();
    createdFloorId = floor?.id;

    // 3. Create Active Table with Floor
    const { data: table } = await supabase
      .from('restaurant_tables')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        table_number: 'TG-05',
        table_token: testTableToken,
        floor_id: createdFloorId,
        is_active: true,
      })
      .select('id')
      .single();
    createdTableId = table?.id;

    // 4. Create Inactive Table
    const { data: inTable } = await supabase
      .from('restaurant_tables')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        table_number: 'TG-INACTIVE',
        table_token: inactiveTableToken,
        floor_id: createdFloorId,
        is_active: false,
      })
      .select('id')
      .single();
    createdInactiveTableId = inTable?.id;

    // 5. Create Menu Category
    const { data: cat } = await supabase
      .from('menu_categories')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        name: 'Chef Specials',
        is_active: true,
        display_order: 1,
      })
      .select('id')
      .single();
    createdCategoryId = cat?.id;

    // 6. Create Available Item & Sold Out Item
    const { data: itemAvail } = await supabase
      .from('menu_items')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        category_id: createdCategoryId,
        name: 'Paneer Tikka Charcoal',
        price: 350,
        is_veg: true,
        is_available: true,
        display_order: 1,
      })
      .select('id')
      .single();
    createdAvailableItemId = itemAvail?.id;

    const { data: itemSoldOut } = await supabase
      .from('menu_items')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        category_id: createdCategoryId,
        name: 'Truffle Mushroom Risotto',
        price: 550,
        is_veg: true,
        is_available: false,
        display_order: 2,
      })
      .select('id')
      .single();
    createdSoldOutItemId = itemSoldOut?.id;

    console.log('✓ Isolated fixtures ready.\n');

    // ── Group 1: Table Token & Menu Resolution ──
    console.log('--- Test Group 1: Table Token & Menu Resolution ---');

    // 1. Valid table token resolves
    const resValid = await makeRequest(`/api/r/${testTableToken}`);
    if (resValid.status !== 200) {
      console.log('DEBUG resValid error:', resValid.status, resValid.data);
    }
    assert(resValid.status === 200, '1. Valid table token resolves HTTP 200');

    // 2. Invalid table token rejected
    const resInvalid = await makeRequest('/api/r/non-existent-token-xyz');
    assert(resInvalid.status === 404, '2. Non-existent table token rejected with HTTP 404');

    // 3. Inactive table token rejected
    const resInactive = await makeRequest(`/api/r/${inactiveTableToken}`);
    assert(resInactive.status === 404, '3. Inactive table token rejected with HTTP 404');

    // 4. Restaurant identity returned correctly
    assert(
      resValid.data?.restaurant?.name === `Spice Garden H5 ${stamp}`,
      `4. Correct restaurant name returned ("Spice Garden H5 ${stamp}")`
    );

    // 5. Table number returned correctly
    assert(resValid.data?.table?.table_number === 'TG-05', '5. Table number returned correctly (TG-05)');

    // 6. Canonical floor name returned correctly
    assert(
      resValid.data?.table?.floor_name === 'Terrace Garden',
      '6. Canonical floor name returned correctly ("Terrace Garden")'
    );

    // 7. Active Categories loaded
    const hasCategory = (resValid.data?.menu?.categories || []).some(
      (c) => c.id === createdCategoryId && c.name === 'Chef Specials'
    );
    assert(hasCategory, '7. Active menu categories load correctly');

    // 8. Available items loaded
    const hasAvailItem = (resValid.data?.menu?.items || []).some(
      (i) => i.id === createdAvailableItemId && i.name === 'Paneer Tikka Charcoal'
    );
    assert(hasAvailItem, '8. Available menu items load correctly');

    // ── Group 2: Order Placement & Server-Authoritative Integrity ──
    console.log('\n--- Test Group 2: Order Placement & Server-Authoritative Integrity ---');

    const guestSessionToken = crypto.randomUUID();

    // 9. Sold-out item cannot be ordered
    const resOrderSoldOut = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        items: [{ menu_item_id: createdSoldOutItemId, quantity: 1 }],
      },
    });
    if (resOrderSoldOut.status !== 400 || !resOrderSoldOut.data?.error?.includes('unavailable')) {
      console.log('DEBUG resOrderSoldOut:', resOrderSoldOut.status, resOrderSoldOut.data);
    }
    assert(
      resOrderSoldOut.status === 400 && resOrderSoldOut.data?.error?.includes('unavailable'),
      '9. Sold-out item order attempt cleanly rejected (HTTP 400: unavailable)'
    );

    // 10. Invalid / non-positive quantity rejected
    const resOrderZeroQty = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        items: [{ menu_item_id: createdAvailableItemId, quantity: 0 }],
      },
    });
    assert(
      resOrderZeroQty.status === 400,
      '10. Non-positive item quantity rejected (HTTP 400)'
    );

    // 11. QR order creation succeeds
    const resOrderSuccess = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        notes: 'Guest requested less spicy and extra mint chutney',
        items: [{ menu_item_id: createdAvailableItemId, quantity: 2, notes: 'Crispy' }],
      },
    });
    if (resOrderSuccess.status !== 200 || !resOrderSuccess.data?.order_id) {
      console.log('DEBUG resOrderSuccess error:', resOrderSuccess.status, resOrderSuccess.data);
    }
    assert(
      resOrderSuccess.status === 200 && resOrderSuccess.data?.order_id,
      '11. Valid QR order creation succeeds with order_id'
    );

    createdOrderId = resOrderSuccess.data?.order_id;
    createdSessionId = resOrderSuccess.data?.table_session_id;

    // 12. Server-enforced order_source = 'qr'
    const { data: dbOrder } = await supabase
      .from('restaurant_orders')
      .select('*')
      .eq('id', createdOrderId)
      .single();

    assert(dbOrder?.order_source === 'qr', '12. Server-side order_source is strictly "qr"');

    // 13. Server-enforced created_by_staff_id = null
    assert(
      dbOrder?.created_by_staff_id === null,
      '13. Server-side created_by_staff_id is strictly null (guest cannot impersonate staff)'
    );

    // 14. Table ownership matches token table
    assert(
      dbOrder?.table_id === createdTableId && dbOrder?.restaurant_id === testRestaurantId,
      '14. Order strictly bound to correct table_id and restaurant_id'
    );

    // 15. Special instructions preserved
    assert(
      dbOrder?.notes === 'Guest requested less spicy and extra mint chutney',
      '15. Order-level special notes preserved accurately'
    );

    // 16. Total calculation correct (2 x 350 = 700)
    assert(
      Number(dbOrder?.total_amount) === 700,
      '16. Server-side total calculated accurately (2 × ₹350 = ₹700)'
    );

    // 17. Initial status is 'placed'
    assert(dbOrder?.status === 'placed', '17. Initial order lifecycle status is "placed"');

    // ── Group 3: Session Tracking, Order Status & Paid Lock ──
    console.log('\n--- Test Group 3: Session Tracking, Order Status & Paid Lock ---');

    // 18. Guest identity capture succeeds
    const resIdentify = await makeRequest(`/api/r/${testTableToken}/session/identify`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        table_session_id: createdSessionId,
        customer_name: 'Aditya Verma',
        customer_phone: '9876543210',
      },
    });
    assert(resIdentify.status === 200, '18. Guest identity registration succeeds');

    // 19. Session summary loads multi-order state
    const resSession = await makeRequest(
      `/api/r/${testTableToken}/session?session_token=${guestSessionToken}`
    );
    assert(
      resSession.status === 200 && resSession.data?.orders?.length > 0,
      '19. Guest session endpoint returns active orders and session total'
    );

    // 20. Order status lookup succeeds for matching session
    const resOrderStatus = await makeRequest(
      `/api/r/orders/${createdOrderId}?session_token=${guestSessionToken}`
    );
    assert(
      resOrderStatus.status === 200 && resOrderStatus.data?.order?.id === createdOrderId,
      '20. Order tracking endpoint resolves order details for valid guest session'
    );

    // 21. Paid session locks out further order placement
    await supabase
      .from('restaurant_table_sessions')
      .update({ payment_status: 'paid' })
      .eq('id', createdSessionId);

    const resOrderAfterPaid = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        table_session_id: createdSessionId,
        items: [{ menu_item_id: createdAvailableItemId, quantity: 1 }],
      },
    });

    assert(
      resOrderAfterPaid.status === 400 && resOrderAfterPaid.data?.session_paid === true,
      '21. Settled / paid session strictly rejects new orders (session_paid: true)'
    );

    console.log('\n===============================================================');
    console.log(`  H-5A VERIFICATION COMPLETE: ${passedAssertions}/${totalAssertions} PASS`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    // ── Teardown: Clean up isolated test data ──
    console.log('--- Cleaning Up Isolated Test Entities ---');
    try {
      if (createdOrderId) {
        await supabase.from('restaurant_order_events').delete().eq('order_id', createdOrderId);
        await supabase.from('restaurant_order_items').delete().eq('order_id', createdOrderId);
        await supabase.from('restaurant_orders').delete().eq('id', createdOrderId);
      }
      if (createdSessionId) {
        await supabase.from('restaurant_table_sessions').delete().eq('id', createdSessionId);
      }
      if (createdAvailableItemId) await supabase.from('menu_items').delete().eq('id', createdAvailableItemId);
      if (createdSoldOutItemId) await supabase.from('menu_items').delete().eq('id', createdSoldOutItemId);
      if (createdCategoryId) await supabase.from('menu_categories').delete().eq('id', createdCategoryId);
      if (createdTableId) await supabase.from('restaurant_tables').delete().eq('id', createdTableId);
      if (createdInactiveTableId) await supabase.from('restaurant_tables').delete().eq('id', createdInactiveTableId);
      if (createdFloorId) await supabase.from('restaurant_floors').delete().eq('id', createdFloorId);
      if (testTenantId) {
        await supabase.from('restaurant_profiles').delete().eq('tenant_id', testTenantId);
        await supabase.from('restaurants').delete().eq('id', testRestaurantId);
        await supabase.from('users_roles').delete().eq('tenant_id', testTenantId);
        await supabase.from('tenants').delete().eq('id', testTenantId);
      }
      console.log('✓ Teardown complete.');
    } catch (cleanupErr) {
      console.warn('Cleanup note:', cleanupErr.message);
    }
  }
}

runTests().catch(console.error);
