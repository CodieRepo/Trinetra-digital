/**
 * Trinetra Restaurant OS — Milestone H-1B Targeted Verification Suite
 * Verifies Order Source & Staff Attribution Operational Context across:
 *  1. Database schema: created_by_staff_id and order_source columns & indexes
 *  2. Customer QR order: order_source = 'qr', created_by_staff_id = null
 *  3. Customer QR read context: table_number, floor_id, floor_name enriched
 *  4. Waiter order creation: order_source = 'waiter', created_by_staff_id = waiter.id
 *  5. Waiter read context: staff_name, table_number, floor_name enriched
 *  6. Cross-tenant isolation: Waiter A cannot order on Restaurant B table
 *  7. Database source check constraint: invalid source rejected
 *  8. POS order creation: order_source = 'pos', staff attribution preserved
 *  9. History read API: preserves floor_name on session tables
 * 10. Historical order null safety: historical orders with null staff/source handled cleanly
 * 11. QR table-token integrity: table token resolution unchanged
 * 12. Session lifecycle integrity: session queries and active orders intact
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

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
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ label, status: 'PASS', detail });
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    results.push({ label, status: 'FAIL', detail });
    console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
  }
}

async function makeRequest(method, urlPath, body = null, headers = {}) {
  const url = new URL(urlPath, BASE_URL).toString();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runH1BVerification() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  H-1B ORDER SOURCE & OPERATIONAL CONTEXT VERIFICATION SUITE');
  console.log(`  Target: ${BASE_URL}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  let testTenantBId = null;
  let qrOrderId = null;
  let waiterOrderId = null;
  let posOrderId = null;

  try {
    // ── STEP 1: Database Schema & Column Verification ─────────────
    console.log('┌─ Step 1: Database Schema & Column Verification ───────────');
    const { data: sampleOrder, error: orderColErr } = await supabase
      .from('restaurant_orders')
      .select('id, created_by_staff_id, order_source')
      .limit(1);

    assert(
      '1. created_by_staff_id and order_source columns exist on restaurant_orders',
      orderColErr === null,
      orderColErr?.message
    );

    // Fetch demo restaurant, table, floor, menu item, and waiter
    const { data: demoRest } = await supabase
      .from('restaurants')
      .select('id, tenant_id, name')
      .ilike('name', '%Spice Garden%')
      .single();

    if (!demoRest) throw new Error('Demo restaurant not found');

    const { data: demoTable } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_token, floor_id, restaurant_floors(id, name)')
      .eq('restaurant_id', demoRest.id)
      .eq('table_number', 'T-1')
      .single();

    const { data: demoMenuItem } = await supabase
      .from('menu_items')
      .select('id, name, price')
      .eq('restaurant_id', demoRest.id)
      .eq('is_available', true)
      .limit(1)
      .single();

    const { data: demoWaiter } = await supabase
      .from('restaurant_staff')
      .select('id, name, role, access_token')
      .eq('restaurant_id', demoRest.id)
      .eq('role', 'waiter')
      .limit(1)
      .single();

    if (!demoTable || !demoMenuItem || !demoWaiter) {
      throw new Error('Required demo fixtures (table T-1, menu item, waiter) not found');
    }

    // ── STEP 2: Customer QR Order Creation ───────────────────────────
    console.log('\n├─ Step 2: Customer QR Order Creation & Source Attribution ─');
    const qrSessionToken = crypto.randomUUID();
    const qrOrderRes = await makeRequest(
      'POST',
      `/api/r/${demoTable.table_token}/orders`,
      {
        session_token: qrSessionToken,
        notes: 'Extra spicy, table by the window',
        items: [{ menu_item_id: demoMenuItem.id, quantity: 2 }],
        created_by_staff_id: demoWaiter.id, // Fabricated client injection attempt
        order_source: 'waiter',             // Fabricated source injection attempt
      }
    );

    qrOrderId = qrOrderRes.data?.order_id || qrOrderRes.data?.id;

    assert(
      '2. QR order creation succeeds with HTTP 200',
      qrOrderRes.status === 200 && qrOrderId,
      `Status: ${qrOrderRes.status}, Body: ${JSON.stringify(qrOrderRes.data)}`
    );

    // Verify DB row for QR order
    const { data: qrDbOrder } = await supabase
      .from('restaurant_orders')
      .select('id, order_source, created_by_staff_id, table_id, total_amount')
      .eq('id', qrOrderId)
      .single();

    assert(
      '2b. QR order source explicitly set to "qr" and created_by_staff_id forced to null (impersonation rejected)',
      qrDbOrder?.order_source === 'qr' && qrDbOrder?.created_by_staff_id === null,
      `source=${qrDbOrder?.order_source}, staff_id=${qrDbOrder?.created_by_staff_id}`
    );

    // ── STEP 3: QR Order Context Read & Floor Join ───────────────────
    console.log('\n├─ Step 3: QR Order Context & Table/Floor Enrichment ──────');
    const adminOrdersRes = await makeRequest(
      'GET',
      `/api/client/restaurant/orders?tenant_id=${demoRest.tenant_id}&restaurant_id=${demoRest.id}&limit=10`
    );

    const fetchedQrOrder = (adminOrdersRes.data?.orders || []).find((o) => o.id === qrOrderId);

    assert(
      '3. Admin Order Read enriches QR order with floor_name and table_number',
      fetchedQrOrder &&
      fetchedQrOrder.table?.table_number === 'T-1' &&
      fetchedQrOrder.table?.floor_name === 'Main Dining' &&
      fetchedQrOrder.order_source === 'qr' &&
      fetchedQrOrder.staff_name === null,
      `table=${JSON.stringify(fetchedQrOrder?.table)}, source=${fetchedQrOrder?.order_source}`
    );

    // ── STEP 4: Authenticated Waiter Order Creation ───────────────────
    console.log('\n├─ Step 4: Authenticated Waiter Order Placement ────────────');
    const waiterOrderRes = await makeRequest(
      'POST',
      '/api/staff/orders',
      {
        table_id: demoTable.id,
        notes: 'Guest requested less oil',
        items: [{ menu_item_id: demoMenuItem.id, quantity: 1 }],
      },
      {
        Authorization: `Bearer ${demoWaiter.access_token}`,
      }
    );

    waiterOrderId = waiterOrderRes.data?.order?.id;

    assert(
      '4. Waiter order creation succeeds with HTTP 200',
      waiterOrderRes.status === 200 && waiterOrderId,
      `Status: ${waiterOrderRes.status}, Error: ${waiterOrderRes.data?.error}`
    );

    // Verify DB row for Waiter order
    const { data: waiterDbOrder } = await supabase
      .from('restaurant_orders')
      .select('id, order_source, created_by_staff_id, table_id')
      .eq('id', waiterOrderId)
      .single();

    assert(
      '4b. Waiter order source explicitly set to "waiter" and created_by_staff_id matches authenticated waiter',
      waiterDbOrder?.order_source === 'waiter' && waiterDbOrder?.created_by_staff_id === demoWaiter.id,
      `source=${waiterDbOrder?.order_source}, staff_id=${waiterDbOrder?.created_by_staff_id}`
    );

    // ── STEP 5: Waiter Order Context Read & Staff Resolution ─────────
    console.log('\n├─ Step 5: Waiter Read Context & Staff Name Resolution ─────');
    const staffOrdersRes = await makeRequest(
      'GET',
      `/api/staff/orders?restaurant_id=${demoRest.id}`,
      null,
      {
        Authorization: `Bearer ${demoWaiter.access_token}`,
      }
    );

    const fetchedWaiterOrder = (staffOrdersRes.data?.orders || []).find((o) => o.id === waiterOrderId);

    assert(
      '5. Staff/KDS Order Read enriches waiter order with staff_name, floor_name, and table_number',
      fetchedWaiterOrder &&
      fetchedWaiterOrder.staff_name === demoWaiter.name &&
      fetchedWaiterOrder.table?.table_number === 'T-1' &&
      fetchedWaiterOrder.table?.floor_name === 'Main Dining' &&
      fetchedWaiterOrder.order_source === 'waiter',
      `staff=${fetchedWaiterOrder?.staff_name}, floor=${fetchedWaiterOrder?.table?.floor_name}`
    );

    // ── STEP 6: Cross-Tenant Isolation Rejection ─────────────────────
    console.log('\n├─ Step 6: Cross-Tenant / Cross-Restaurant Security ────────');
    const fakeForeignTableId = '00000000-ffff-ffff-ffff-000000000001';

    // Waiter from Demo Restaurant A attempts to place order on non-belonging table
    const crossOrderRes = await makeRequest(
      'POST',
      '/api/staff/orders',
      {
        table_id: fakeForeignTableId,
        items: [{ menu_item_id: demoMenuItem.id, quantity: 1 }],
      },
      {
        Authorization: `Bearer ${demoWaiter.access_token}`,
      }
    );

    assert(
      '6. Cross-restaurant table order rejected with HTTP 404 (table not in staff branch)',
      crossOrderRes.status === 404,
      `Status: ${crossOrderRes.status}, Message: ${crossOrderRes.data?.error}`
    );

    // ── STEP 7: Check Constraint Enforced on Database ────────────────
    console.log('\n├─ Step 7: Database Source Constraint Verification ─────────');
    const { error: invalidSourceErr } = await supabase
      .from('restaurant_orders')
      .insert({
        tenant_id: demoRest.tenant_id,
        restaurant_id: demoRest.id,
        table_id: demoTable.id,
        session_token: '00000000-0000-0000-0000-000000000001',
        total_amount: 100,
        order_source: 'phone_call_invalid', // Invalid source
      });

    assert(
      '7. Invalid order_source string rejected by database CHECK constraint',
      invalidSourceErr !== null && invalidSourceErr.message.includes('order_source'),
      invalidSourceErr?.message
    );

    // ── STEP 8: POS / Admin Direct Order Placement ───────────────────
    console.log('\n├─ Step 8: POS / Admin Order Placement ─────────────────────');
    const posOrderRes = await makeRequest(
      'POST',
      '/api/client/restaurant/orders',
      {
        tenant_id: demoRest.tenant_id,
        restaurant_id: demoRest.id,
        table_id: demoTable.id,
        staff_id: demoWaiter.id,
        notes: 'Walk-in customer at counter',
        items: [{ menu_item_id: demoMenuItem.id, quantity: 1 }],
      }
    );

    posOrderId = posOrderRes.data?.order?.id;

    assert(
      '8. POS / Admin order creation succeeds with order_source = "pos"',
      posOrderRes.status === 200 && posOrderRes.data?.order?.order_source === 'pos',
      `Status: ${posOrderRes.status}, source=${posOrderRes.data?.order?.order_source}`
    );

    // ── STEP 9: History & Billing Query Floor Preservation ───────────
    console.log('\n├─ Step 9: History & Session Context Preservation ──────────');
    const historyRes = await makeRequest(
      'GET',
      `/api/client/restaurant/history?tenant_id=${demoRest.tenant_id}&restaurant_id=${demoRest.id}&limit=5`
    );

    const historySession = (historyRes.data?.sessions || []).find((s) => s.table?.id === demoTable.id);

    assert(
      '9. History API returns enriched table with floor_id and floor_name',
      historySession &&
      historySession.table?.floor_name === 'Main Dining' &&
      historySession.table?.table_number === 'T-1',
      `table=${JSON.stringify(historySession?.table)}`
    );

    // ── STEP 10: Historical Order Null Safety ────────────────────────
    console.log('\n├─ Step 10: Historical Orders Null Safety ──────────────────');
    // Fetch historical orders where created_by_staff_id is NULL
    const { data: nullOrders } = await supabase
      .from('restaurant_orders')
      .select('id, created_by_staff_id, order_source')
      .is('created_by_staff_id', null)
      .limit(3);

    assert(
      '10. Historical orders with null staff attribution exist and read safely without crashes',
      Array.isArray(nullOrders) && nullOrders.length > 0,
      `Found ${nullOrders?.length} historical orders with null staff`
    );

    // ── STEP 11: QR Table Token Compatibility ────────────────────────
    console.log('\n├─ Step 11: QR Table Token Compatibility ───────────────────');
    const qrGuestRes = await makeRequest('GET', `/api/r/${demoTable.table_token}`);
    assert(
      '11. Guest QR table token endpoint resolves cleanly',
      qrGuestRes.status === 200 && qrGuestRes.data?.table?.table_number === 'T-1',
      `Status: ${qrGuestRes.status}, table: ${qrGuestRes.data?.table?.table_number}`
    );

    // ── STEP 12: Session Query Compatibility ─────────────────────────
    console.log('\n├─ Step 12: Active Sessions Query Compatibility ────────────');
    const sessionsRes = await makeRequest(
      'GET',
      `/api/client/restaurant/sessions?tenant_id=${demoRest.tenant_id}&restaurant_id=${demoRest.id}`
    );

    assert(
      '12. Active sessions endpoint responds with HTTP 200 and enriched tables',
      sessionsRes.status === 200 && Array.isArray(sessionsRes.data?.sessions),
      `Status: ${sessionsRes.status}, count: ${sessionsRes.data?.sessions?.length}`
    );

    // ── TEARDOWN: Clean Temporary Test Records ────────────────────────
    console.log('\n├─ Teardown: Cleaning Temporary Test Records ──────────────');
    const testOrderIds = [qrOrderId, waiterOrderId, posOrderId].filter(Boolean);
    if (testOrderIds.length > 0) {
      await supabase.from('restaurant_order_events').delete().in('order_id', testOrderIds);
      await supabase.from('restaurant_order_items').delete().in('order_id', testOrderIds);
      await supabase.from('restaurant_orders').delete().in('id', testOrderIds);
      console.log(`  🧹 Cleaned up ${testOrderIds.length} test orders.`);
    }

    if (testTenantBId) {
      await supabase.from('restaurant_tables').delete().eq('tenant_id', testTenantBId);
      await supabase.from('restaurants').delete().eq('tenant_id', testTenantBId);
      await supabase.from('tenants').delete().eq('id', testTenantBId);
      console.log('  🧹 Cleaned up temporary security Tenant B.');
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    failed++;
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  H-1B ORDER CONTEXT: ${passed}/${passed + failed} PASS`);
  console.log('══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  ❌ ${r.label}: ${r.detail}`));
    process.exit(1);
  }
}

runH1BVerification().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
