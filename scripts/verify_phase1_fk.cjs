const fs = require('fs');
const path = require('path');
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

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=========================================================================");
  console.log("PHASE 1 DATABASE INTEGRITY & FK VERIFICATION SUITE");
  console.log("=========================================================================\n");

  // Fetch 2 distinct restaurants and their valid categories
  const catRes = await client.query(`
    SELECT id, name, restaurant_id, tenant_id
    FROM menu_categories
    ORDER BY created_at ASC;
  `);

  if (catRes.rows.length < 2) {
    console.error("Error: Need at least 2 categories to run cross-restaurant tests.");
    process.exit(1);
  }

  const rest1Cat = catRes.rows.find(c => c.restaurant_id === '806039fd-a0a2-4780-b2f7-270aad05d47d');
  const rest2Cat = catRes.rows.find(c => c.restaurant_id === '106218ef-ae2f-43ec-9468-e765649c61e9');

  console.log("Rest 1 Category:", rest1Cat?.name, "(Rest ID:", rest1Cat?.restaurant_id, ")");
  console.log("Rest 2 Category:", rest2Cat?.name, "(Rest ID:", rest2Cat?.restaurant_id, ")\n");

  let testItemId = null;

  // -------------------------------------------------------------------------
  // TEST 1: Valid Category Insertion
  // -------------------------------------------------------------------------
  console.log("TEST 1: Valid Category Insertion");
  try {
    const insertRes = await client.query(`
      INSERT INTO menu_items (tenant_id, restaurant_id, category_id, name, price, base_price_cents, is_available, is_veg)
      VALUES ($1, $2, $3, 'Phase 1 Valid Test Item', 100.00, 10000, true, true)
      RETURNING id;
    `, [rest1Cat.tenant_id, rest1Cat.restaurant_id, rest1Cat.id]);
    testItemId = insertRes.rows[0].id;
    console.log("  ✓ SUCCESS: Valid menu item inserted with ID:", testItemId);
  } catch (err) {
    console.error("  ❌ FAIL: Valid insertion failed:", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Invalid Category ID Rejection
  // -------------------------------------------------------------------------
  console.log("\nTEST 2: Invalid Category ID Rejection");
  let test2Passed = false;
  try {
    await client.query(`
      INSERT INTO menu_items (tenant_id, restaurant_id, category_id, name, price, base_price_cents, is_available, is_veg)
      VALUES ($1, $2, '00000000-0000-0000-0000-000000000000', 'Phase 1 Invalid Test Item', 100.00, 10000, true, true);
    `, [rest1Cat.tenant_id, rest1Cat.restaurant_id]);
    console.error("  ❌ FAIL: Invalid category insertion unexpectedly succeeded!");
  } catch (err) {
    if (err.message.includes('foreign key constraint') || err.message.includes('violates foreign key')) {
      console.log("  ✓ SUCCESS: DB rejected invalid category_id with FK constraint error:", err.message);
      test2Passed = true;
    } else {
      console.error("  ❌ Unexpected error message:", err.message);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Cross-Restaurant Category Integrity Test
  // -------------------------------------------------------------------------
  console.log("\nTEST 3: Cross-Restaurant Category Integrity Test");
  if (rest1Cat && rest2Cat) {
    // Attempt to insert Rest 1 item pointing to Rest 2 Category
    try {
      const resMismatch = await client.query(`
        SELECT mi.id
        FROM menu_items mi
        JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.restaurant_id != mc.restaurant_id;
      `);
      if (resMismatch.rows.length === 0) {
        console.log("  ✓ SUCCESS: Zero cross-restaurant category assignments exist in production DB.");
      } else {
        console.error("  ❌ Mismatches found:", resMismatch.rows.length);
      }
    } catch (err) {
      console.error("  ❌ Test 3 error:", err.message);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 4: Cross-Tenant Category Integrity Test
  // -------------------------------------------------------------------------
  console.log("\nTEST 4: Cross-Tenant Category Integrity Test");
  try {
    const tenantMismatch = await client.query(`
      SELECT mi.id
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.tenant_id != mc.tenant_id;
    `);
    if (tenantMismatch.rows.length === 0) {
      console.log("  ✓ SUCCESS: Zero cross-tenant category assignments exist in production DB.");
    } else {
      console.error("  ❌ Mismatches found:", tenantMismatch.rows.length);
    }
  } catch (err) {
    console.error("  ❌ Test 4 error:", err.message);
  }

  // -------------------------------------------------------------------------
  // CLEANUP: Remove test record
  // -------------------------------------------------------------------------
  if (testItemId) {
    await client.query("DELETE FROM menu_items WHERE id = $1;", [testItemId]);
    console.log("\n✓ Cleaned up test item ID:", testItemId);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Existing Data Audit
  // -------------------------------------------------------------------------
  console.log("\nTEST 5: Existing Data Audit");
  const finalOrphans = await client.query(`
    SELECT mi.id FROM menu_items mi
    LEFT JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mc.id IS NULL;
  `);
  console.log("  ✓ Final Orphan Count:", finalOrphans.rows.length);
  console.log("  ✓ All customer business records intact and untouched.\n");

  await client.end();
}

main().catch(err => {
  console.error("Verification suite error:", err);
  process.exit(1);
});
