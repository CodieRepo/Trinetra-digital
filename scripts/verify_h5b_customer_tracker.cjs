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
  console.log('  RESTAURANT OS — H-5B CUSTOMER TRACKER & SETTLEMENT VERIFICATION');
  console.log(`  Target: ${BASE_URL}`);
  console.log('===============================================================\n');

  const stamp = Date.now();
  let testTenantId = null;
  let testRestaurantId = null;
  const testTableToken = crypto.randomUUID();
  const guestSessionToken = crypto.randomUUID();

  let createdFloorId = null;
  let createdTableId = null;
  let createdCategoryId = null;
  let createdItem1Id = null;
  let createdItem2Id = null;
  let createdSessionId = null;
  let createdOrder1Id = null;
  let createdOrder2Id = null;
  let createdStaffId = null;

  try {
    // ── Phase 0: Provision isolated test entities ──
    console.log('--- Phase 0: Setup Isolated Test Fixtures ---');

    // 1. Create Restaurant using provision_restaurant_rpc
    const prov = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: `H5B Customer Group ${stamp}`,
      p_restaurant_name: `Spice Garden H5B ${stamp}`,
      p_owner_email: `customer_h5b_${stamp}@test.com`,
      p_owner_name: 'H5B Tracker Tester',
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
        name: 'Private Dining Mezzanine',
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
        table_number: 'PDM-01',
        table_token: testTableToken,
        floor_id: createdFloorId,
        is_active: true,
      })
      .select('id')
      .single();
    createdTableId = table?.id;

    // 4. Create Menu Category & Items
    const { data: cat } = await supabase
      .from('menu_categories')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        name: 'Curries & Breads',
        is_active: true,
        display_order: 1,
      })
      .select('id')
      .single();
    createdCategoryId = cat?.id;

    const { data: item1 } = await supabase
      .from('menu_items')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        category_id: createdCategoryId,
        name: 'Dal Bukhara Heritage',
        price: 400,
        is_veg: true,
        is_available: true,
        display_order: 1,
      })
      .select('id')
      .single();
    createdItem1Id = item1?.id;

    const { data: item2 } = await supabase
      .from('menu_items')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        category_id: createdCategoryId,
        name: 'Garlic Butter Naan',
        price: 120,
        is_veg: true,
        is_available: true,
        display_order: 2,
      })
      .select('id')
      .single();
    createdItem2Id = item2?.id;

    // 5. Create Staff Member
    let createdStaffId = null;
    const { data: staff } = await supabase
      .from('restaurant_staff')
      .insert({
        tenant_id: testTenantId,
        restaurant_id: testRestaurantId,
        name: 'Chef Ranveer',
        role: 'kitchen',
        is_active: true,
      })
      .select('id')
      .single();
    createdStaffId = staff?.id;

    console.log('✓ Isolated fixtures ready.\n');

    // ── Group 1: Order #1 Placement & Live Tracker Resolution ──
    console.log('--- Test Group 1: Order #1 Placement & Live Tracker Resolution ---');

    // 1. Submit Order #1 (1 x Dal Bukhara = ₹400)
    const resOrder1 = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        notes: 'Mild spicy, extra butter',
        items: [{ menu_item_id: createdItem1Id, quantity: 1, notes: 'Hot' }],
      },
    });
    assert(resOrder1.status === 200 && resOrder1.data?.order_id, '1. Order #1 placement succeeds');
    createdOrder1Id = resOrder1.data.order_id;
    createdSessionId = resOrder1.data.table_session_id;

    // 2. Order tracking resolves for valid session
    const resTrack1 = await makeRequest(
      `/api/r/orders/${createdOrder1Id}?session_token=${guestSessionToken}`
    );
    assert(resTrack1.status === 200, '2. Order tracking endpoint resolves HTTP 200');

    // 3. Non-existent order returns 404
    const resTrack404 = await makeRequest(
      `/api/r/orders/${crypto.randomUUID()}?session_token=${guestSessionToken}`
    );
    assert(resTrack404.status === 404, '3. Non-existent order returns HTTP 404');

    // 4. Mismatched session token returns 404
    const resTrackWrongSession = await makeRequest(
      `/api/r/orders/${createdOrder1Id}?session_token=${crypto.randomUUID()}`
    );
    assert(resTrackWrongSession.status === 404, '4. Cross-session unauthorized order access rejected (HTTP 404)');

    // 5. Correct restaurant identity in order tracker
    assert(
      resTrack1.data?.restaurant?.name === `Spice Garden H5B ${stamp}`,
      '5. Correct restaurant identity returned in order tracker'
    );

    // 6. Correct table number & canonical floor name
    assert(
      resTrack1.data?.table?.table_number === 'PDM-01' &&
        resTrack1.data?.table?.floor_name === 'Private Dining Mezzanine',
      '6. Canonical table number (PDM-01) and floor name (Private Dining Mezzanine) resolved'
    );

    // 7. Initial status is placed
    assert(resTrack1.data?.order?.status === 'placed', '7. Order initial status is "placed" (Order Received)');

    // 8. Order items & line calculations exact
    assert(
      resTrack1.data?.items?.length === 1 &&
        resTrack1.data?.items[0]?.name === 'Dal Bukhara Heritage' &&
        resTrack1.data?.items[0]?.quantity === 1,
      '8. Order items and quantities returned accurately'
    );

    // 9. Special instructions preserved
    assert(
      resTrack1.data?.order?.notes === 'Mild spicy, extra butter',
      '9. Order special instructions preserved accurately'
    );

    // ── Group 2: Multi-Order Session Flow (Order #2 Placement) ──
    console.log('\n--- Test Group 2: Multi-Order Session Flow (Order #2 Placement) ---');

    // 10. Place Order #2 under same session (2 x Garlic Naan = ₹240)
    const resOrder2 = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        table_session_id: createdSessionId,
        notes: 'Crispy well-done',
        items: [{ menu_item_id: createdItem2Id, quantity: 2 }],
      },
    });
    assert(resOrder2.status === 200 && resOrder2.data?.order_id, '10. Order #2 placement succeeds in existing session');
    createdOrder2Id = resOrder2.data.order_id;

    // 11. Order #1 and Order #2 remain distinct records (no merging)
    assert(createdOrder1Id !== createdOrder2Id, '11. Orders remain strictly separated with distinct IDs');

    // 12. Session aggregation returns 2 orders
    const resSession = await makeRequest(
      `/api/r/${testTableToken}/session?session_token=${guestSessionToken}`
    );
    assert(
      resSession.status === 200 && resSession.data?.orders?.length === 2,
      '12. Session endpoint returns exactly 2 separate order tickets'
    );

    // 13. Session total is exact sum (₹400 + ₹240 = ₹640)
    assert(
      Number(resSession.data?.sessionTotal || resSession.data?.session?.session_total) === 640,
      '13. Session total is accurately aggregated (₹400 + ₹240 = ₹640)'
    );

    // ── Group 3: Order Status Progression & Events Audit ──
    console.log('\n--- Test Group 3: Order Status Progression & Events Audit ---');

    // 14. Kitchen transitions Order #1: placed -> preparing
    const { error: upErr } = await supabase
      .from('restaurant_orders')
      .update({ status: 'preparing', updated_at: new Date().toISOString() })
      .eq('id', createdOrder1Id);
    if (upErr) console.error('Order status update error:', upErr);

    const { error: evtErr } = await supabase
      .from('restaurant_order_events')
      .insert({
        tenant_id: testTenantId,
        order_id: createdOrder1Id,
        from_status: 'placed',
        to_status: 'preparing',
        actor_role: 'kitchen',
        actor_id: createdStaffId,
      });
    if (evtErr) console.error('Order event insert error:', evtErr);

    const resTrackUpdated = await makeRequest(
      `/api/r/orders/${createdOrder1Id}?session_token=${guestSessionToken}`
    );
    assert(
      resTrackUpdated.data?.order?.status === 'preparing',
      '14. Order tracker reflects updated status "preparing" (Being Prepared)'
    );

    // 15. Order events list contains audit history
    assert(
      resTrackUpdated.data?.events?.some((e) => e.to_status === 'preparing'),
      '15. Order event audit history includes transition events'
    );

    // ── Group 4: Bill Request & Customer Payment Settlement ──
    console.log('\n--- Test Group 4: Bill Request & Customer Payment Settlement ---');

    // 16. Request bill endpoint notifies staff
    const resReqBill1 = await makeRequest(`/api/r/${testTableToken}/session/request-bill`, {
      method: 'POST',
      body: { sessionId: createdSessionId },
    });
    assert(resReqBill1.status === 200 && resReqBill1.data?.success === true, '16. "Request Bill from Waiter" succeeds');

    // 17. Duplicate request bill is idempotent
    const resReqBill2 = await makeRequest(`/api/r/${testTableToken}/session/request-bill`, {
      method: 'POST',
      body: { sessionId: createdSessionId },
    });
    assert(resReqBill2.status === 200 && resReqBill2.data?.success === true, '17. Duplicate bill request is idempotent & safe');

    // 18. Customer payment notification (UPI QR / UTR)
    const resPay = await makeRequest(`/api/r/${testTableToken}/session/pay`, {
      method: 'POST',
      body: {
        sessionId: createdSessionId,
        paymentMethod: 'upi_qr',
        utrNumber: 'UTR-9876543210',
        tipAmount: 50,
        amount: 640,
      },
    });
    assert(resPay.status === 200 && resPay.data?.success === true, '18. Customer UPI payment notification succeeds with UTR & tip');

    // 19. Session payment status update to 'paid' (Settled by Cashier)
    await supabase
      .from('restaurant_table_sessions')
      .update({ payment_status: 'paid' })
      .eq('id', createdSessionId);

    // 20. Paid session reflects paymentStatus = 'paid'
    const resSessionPaid = await makeRequest(
      `/api/r/${testTableToken}/session?session_token=${guestSessionToken}`
    );
    assert(
      resSessionPaid.data?.session?.payment_status === 'paid',
      '19. Session reflects "paid" settlement status (Bill Settled ✓)'
    );

    // 21. Settled session prevents placing new order
    const resOrderAfterSettled = await makeRequest(`/api/r/${testTableToken}/orders`, {
      method: 'POST',
      body: {
        session_token: guestSessionToken,
        table_session_id: createdSessionId,
        items: [{ menu_item_id: createdItem1Id, quantity: 1 }],
      },
    });
    assert(
      resOrderAfterSettled.status === 400 && resOrderAfterSettled.data?.session_paid === true,
      '20. Settled session strictly rejects subsequent order placement (session_paid: true)'
    );

    // 22. Cross-table bill request rejected with 404
    const resCrossTableBill = await makeRequest(`/api/r/${crypto.randomUUID()}/session/request-bill`, {
      method: 'POST',
      body: { sessionId: createdSessionId },
    });
    assert(resCrossTableBill.status === 404, '21. Cross-table unauthorized bill request rejected (HTTP 404)');

    // 23. Tenant isolation preserved
    assert(
      resSession.data?.orders?.every((o) => o.restaurant_id === testRestaurantId),
      '22. 100% of session orders strictly isolated to authenticated test restaurant'
    );

    console.log('\n===============================================================');
    console.log(`  H-5B VERIFICATION COMPLETE: ${passedAssertions}/${totalAssertions} PASS`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    // ── Teardown: Clean up isolated test data ──
    console.log('--- Cleaning Up Isolated Test Entities ---');
    try {
      if (createdOrder1Id) {
        await supabase.from('restaurant_order_events').delete().eq('order_id', createdOrder1Id);
        await supabase.from('restaurant_order_items').delete().eq('order_id', createdOrder1Id);
        await supabase.from('restaurant_orders').delete().eq('id', createdOrder1Id);
      }
      if (createdOrder2Id) {
        await supabase.from('restaurant_order_events').delete().eq('order_id', createdOrder2Id);
        await supabase.from('restaurant_order_items').delete().eq('order_id', createdOrder2Id);
        await supabase.from('restaurant_orders').delete().eq('id', createdOrder2Id);
      }
      if (createdSessionId) {
        await supabase.from('restaurant_table_sessions').delete().eq('id', createdSessionId);
      }
      if (createdItem1Id) await supabase.from('menu_items').delete().eq('id', createdItem1Id);
      if (createdItem2Id) await supabase.from('menu_items').delete().eq('id', createdItem2Id);
      if (createdCategoryId) await supabase.from('menu_categories').delete().eq('id', createdCategoryId);
      if (createdTableId) await supabase.from('restaurant_tables').delete().eq('id', createdTableId);
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
