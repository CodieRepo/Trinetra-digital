const fs = require('fs');
const path = require('path');
const pg = require('pg');
const { Client } = pg;

// Parse .env if env vars not present
function loadEnv() {
  if (process.env.DIRECT_URL || process.env.DATABASE_URL) return;
  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    }
  } catch (e) {
    // Ignore error
  }
}

loadEnv();

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function main() {
  if (!directUrl) {
    console.error("ERROR: DIRECT_URL or DATABASE_URL not set in environment.");
    process.exit(1);
  }
  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected to production DB.\n");

  console.log("=== 1. ORPHANED MENU ITEMS ===");
  const orphanRes = await client.query(`
    SELECT mi.id, mi.name, mi.category_id, mi.restaurant_id, mi.tenant_id
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mc.id IS NULL;
  `);
  console.log("Orphan count:", orphanRes.rows.length);

  console.log("\n=== 2. NULL CATEGORY_ID IN MENU_ITEMS ===");
  const nullCatRes = await client.query(`
    SELECT id, name, restaurant_id, tenant_id
    FROM menu_items
    WHERE category_id IS NULL;
  `);
  console.log("Null category_id count:", nullCatRes.rows.length);

  console.log("\n=== 3. TENANT MISMATCHES ===");
  const tenantMismatchRes = await client.query(`
    SELECT mi.id AS item_id, mi.name AS item_name, mi.tenant_id AS item_tenant, mc.tenant_id AS cat_tenant
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mi.tenant_id IS DISTINCT FROM mc.tenant_id;
  `);
  console.log("Tenant mismatch count:", tenantMismatchRes.rows.length);

  console.log("\n=== 4. RESTAURANT MISMATCHES ===");
  const restMismatchRes = await client.query(`
    SELECT mi.id AS item_id, mi.name AS item_name, mi.restaurant_id AS item_rest, mc.restaurant_id AS cat_rest
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mi.restaurant_id IS DISTINCT FROM mc.restaurant_id;
  `);
  console.log("Restaurant mismatch count:", restMismatchRes.rows.length);

  console.log("\n=== 5. MENU ITEMS PER CATEGORY COUNT ===");
  const catCountRes = await client.query(`
    SELECT mc.id AS category_id, mc.name AS category_name, mc.restaurant_id, COUNT(mi.id) AS item_count
    FROM menu_categories mc
    LEFT JOIN menu_items mi ON mc.id = mi.category_id
    GROUP BY mc.id, mc.name, mc.restaurant_id
    ORDER BY mc.name;
  `);
  console.log(JSON.stringify(catCountRes.rows, null, 2));

  console.log("\n=== 6. EXISTING CONSTRAINTS ON menu_categories & menu_items ===");
  const existingConsRes = await client.query(`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('menu_items', 'menu_categories')
    ORDER BY tc.table_name, tc.constraint_name;
  `);
  console.log(JSON.stringify(existingConsRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error("Preflight error:", err);
  process.exit(1);
});
