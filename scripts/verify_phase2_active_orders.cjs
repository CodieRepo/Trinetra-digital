const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pg = require('pg');
const { Client } = pg;

function loadEnv() {
  if (process.env.DIRECT_URL || process.env.DATABASE_URL) return;
  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) process.env[match[1]] = match[2];
    }
  } catch (e) {}
}

loadEnv();

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function main() {
  if (!directUrl) {
    console.error("ERROR: DIRECT_URL or DATABASE_URL not set.");
    process.exit(1);
  }

  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=========================================================================");
  console.log("PHASE 2 — ACTIVE ORDERS & SESSION MODEL VERIFICATION SUITE");
  console.log("=========================================================================\n");

  let testTenantId = null;
  let testRestId = null;
  let otherRestId = null;
  let testTableId = null;
  let otherTableId = null;
  let testSessionId = null;
  let otherSessionId = null;
  let testOrderId = null;
  let otherOrderId = null;

  try {
    // Fetch an existing restaurant and tenant for testing
    const restRes = await client.query(`SELECT id, tenant_id FROM restaurants LIMIT 2;`);
    if (restRes.rows.length < 2) {
      throw new Error("Need at least 2 restaurants in DB to test isolation.");
    }

    testRestId = restRes.rows[0].id;
    testTenantId = restRes.rows[0].tenant_id;
    otherRestId = restRes.rows[1].id;

    // Fetch tables for both restaurants
    const table1Res = await client.query(`SELECT id FROM restaurant_tables WHERE restaurant_id = $1 LIMIT 1;`, [testRestId]);
    const table2Res = await client.query(`SELECT id FROM restaurant_tables WHERE restaurant_id = $1 LIMIT 1;`, [otherRestId]);

    testTableId = table1Res.rows[0]?.id;
    otherTableId = table2Res.rows[0]?.id;

    if (!testTableId || !otherTableId) {
      throw new Error("Tables missing for test restaurants.");
    }

    // -------------------------------------------------------------------------
    // TEST A: Active session + placed order -> Active Count = 1
    // -------------------------------------------------------------------------
    console.log("TEST A: Active session + placed order");
    const sessRes = await client.query(`
      INSERT INTO restaurant_table_sessions (tenant_id, restaurant_id, table_id, status, payment_status)
      VALUES ($1, $2, $3, 'active', 'unpaid')
      RETURNING id;
    `, [testTenantId, testRestId, testTableId]);
    testSessionId = sessRes.rows[0].id;

    const orderRes = await client.query(`
      INSERT INTO restaurant_orders (tenant_id, restaurant_id, table_id, table_session_id, session_token, status, total_amount)
      VALUES ($1, $2, $3, $4, $5, 'placed', 100.00)
      RETURNING id;
    `, [testTenantId, testRestId, testTableId, testSessionId, crypto.randomUUID()]);
    testOrderId = orderRes.rows[0].id;

    // Execute active order query simulation (equivalent to orders.ts active scope)
    const activeQueryRes = await client.query(`
      SELECT o.id, o.status, o.table_session_id
      FROM restaurant_orders o
      JOIN restaurant_table_sessions s ON o.table_session_id = s.id
      WHERE o.restaurant_id = $1
        AND s.status = 'active'
        AND o.status IN ('placed', 'accepted', 'preparing', 'ready');
    `, [testRestId]);

    const activeOrdersForRest = activeQueryRes.rows.filter(r => r.table_session_id === testSessionId);
    if (activeOrdersForRest.length === 1) {
      console.log("  ✓ PASS: Active order count = 1 for active session with 'placed' order.");
    } else {
      console.error("  ❌ FAIL: Expected 1 active order, got:", activeOrdersForRest.length);
    }

    // -------------------------------------------------------------------------
    // TEST B: Progress order to served -> Active Count = 0 (remains in Live Session)
    // -------------------------------------------------------------------------
    console.log("\nTEST B: Progress order to 'served'");
    await client.query(`UPDATE restaurant_orders SET status = 'served' WHERE id = $1;`, [testOrderId]);

    const servedActiveQuery = await client.query(`
      SELECT o.id
      FROM restaurant_orders o
      JOIN restaurant_table_sessions s ON o.table_session_id = s.id
      WHERE o.restaurant_id = $1
        AND s.status = 'active'
        AND o.status IN ('placed', 'accepted', 'preparing', 'ready');
    `, [testRestId]);

    const activeAfterServed = servedActiveQuery.rows.filter(r => r.id === testOrderId);
    if (activeAfterServed.length === 0) {
      console.log("  ✓ PASS: Served order correctly excluded from Active Orders metrics (Count = 0).");
    } else {
      console.error("  ❌ FAIL: Served order still counted in Active Orders!");
    }

    // Verify served order is still present in active session orders for Live Tables
    const sessionOrdersQuery = await client.query(`
      SELECT id, status FROM restaurant_orders WHERE table_session_id = $1;
    `, [testSessionId]);
    if (sessionOrdersQuery.rows.length === 1 && sessionOrdersQuery.rows[0].status === 'served') {
      console.log("  ✓ PASS: Served order remains accessible to Live Tables session card.");
    } else {
      console.error("  ❌ FAIL: Served order missing from Live Tables session card!");
    }

    // -------------------------------------------------------------------------
    // TEST C: Session settled (closed + paid) -> Active API returns 0
    // -------------------------------------------------------------------------
    console.log("\nTEST C: Session settled (closed + paid)");
    await client.query(`
      UPDATE restaurant_table_sessions
      SET status = 'closed', payment_status = 'paid', closed_at = NOW()
      WHERE id = $1;
    `, [testSessionId]);

    const settledActiveQuery = await client.query(`
      SELECT o.id
      FROM restaurant_orders o
      JOIN restaurant_table_sessions s ON o.table_session_id = s.id
      WHERE o.restaurant_id = $1
        AND s.status = 'active'
        AND o.status NOT IN ('closed', 'cancelled');
    `, [testRestId]);

    const settledActiveCount = settledActiveQuery.rows.filter(r => r.id === testOrderId).length;
    if (settledActiveCount === 0) {
      console.log("  ✓ PASS: Settled session orders strictly excluded from Active Operations (Count = 0).");
    } else {
      console.error("  ❌ FAIL: Settled session order appeared in Active Operations!");
    }

    // -------------------------------------------------------------------------
    // TEST D: Cancelled order -> Excluded from active results
    // -------------------------------------------------------------------------
    console.log("\nTEST D: Cancelled order exclusion");
    const cancelledSessRes = await client.query(`
      INSERT INTO restaurant_table_sessions (tenant_id, restaurant_id, table_id, status, payment_status)
      VALUES ($1, $2, $3, 'active', 'unpaid')
      RETURNING id;
    `, [testTenantId, testRestId, testTableId]);
    const cancelledSessId = cancelledSessRes.rows[0].id;

    const cancelledOrderRes = await client.query(`
      INSERT INTO restaurant_orders (tenant_id, restaurant_id, table_id, table_session_id, session_token, status, total_amount)
      VALUES ($1, $2, $3, $4, $5, 'cancelled', 50.00)
      RETURNING id;
    `, [testTenantId, testRestId, testTableId, cancelledSessId, crypto.randomUUID()]);
    const cancelledOrderId = cancelledOrderRes.rows[0].id;

    const cancelledActiveQuery = await client.query(`
      SELECT o.id
      FROM restaurant_orders o
      JOIN restaurant_table_sessions s ON o.table_session_id = s.id
      WHERE o.restaurant_id = $1
        AND s.status = 'active'
        AND o.status IN ('placed', 'accepted', 'preparing', 'ready');
    `, [testRestId]);

    if (cancelledActiveQuery.rows.filter(r => r.id === cancelledOrderId).length === 0) {
      console.log("  ✓ PASS: Cancelled order excluded from Active Orders.");
    } else {
      console.error("  ❌ FAIL: Cancelled order appeared in Active Orders!");
    }

    // Cleanup cancelled test objects
    await client.query(`DELETE FROM restaurant_orders WHERE id = $1;`, [cancelledOrderId]);
    await client.query(`DELETE FROM restaurant_table_sessions WHERE id = $1;`, [cancelledSessId]);

    // -------------------------------------------------------------------------
    // TEST E: Unrelated restaurant data isolation
    // -------------------------------------------------------------------------
    console.log("\nTEST E: Cross-restaurant data isolation");
    const otherSessRes = await client.query(`
      INSERT INTO restaurant_table_sessions (tenant_id, restaurant_id, table_id, status, payment_status)
      VALUES ((SELECT tenant_id FROM restaurants WHERE id = $1), $1, $2, 'active', 'unpaid')
      RETURNING id;
    `, [otherRestId, otherTableId]);
    otherSessionId = otherSessRes.rows[0].id;

    const otherOrderRes = await client.query(`
      INSERT INTO restaurant_orders (tenant_id, restaurant_id, table_id, table_session_id, session_token, status, total_amount)
      VALUES ((SELECT tenant_id FROM restaurants WHERE id = $1), $1, $2, $3, $4, 'placed', 200.00)
      RETURNING id;
    `, [otherRestId, otherTableId, otherSessionId, crypto.randomUUID()]);
    otherOrderId = otherOrderRes.rows[0].id;

    const leakQuery = await client.query(`
      SELECT o.id
      FROM restaurant_orders o
      JOIN restaurant_table_sessions s ON o.table_session_id = s.id
      WHERE o.restaurant_id = $1
        AND s.status = 'active';
    `, [testRestId]);

    if (leakQuery.rows.filter(r => r.id === otherOrderId).length === 0) {
      console.log("  ✓ PASS: Restaurant B order never leaks into Restaurant A active query.");
    } else {
      console.error("  ❌ FAIL: Cross-restaurant data leak detected!");
    }

  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP ALL TEST RECORDS
    // -------------------------------------------------------------------------
    console.log("\nCLEANUP: Removing all test records...");
    if (testOrderId) await client.query(`DELETE FROM restaurant_orders WHERE id = $1;`, [testOrderId]);
    if (otherOrderId) await client.query(`DELETE FROM restaurant_orders WHERE id = $1;`, [otherOrderId]);
    if (testSessionId) await client.query(`DELETE FROM restaurant_table_sessions WHERE id = $1;`, [testSessionId]);
    if (otherSessionId) await client.query(`DELETE FROM restaurant_table_sessions WHERE id = $1;`, [otherSessionId]);
    console.log("  ✓ Cleaned up test orders & sessions successfully.");

    await client.end();
  }
}

main().catch(console.error);
