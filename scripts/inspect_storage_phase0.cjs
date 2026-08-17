const pg = require('pg');
const { Client } = pg;

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.log("Skipping script: DIRECT_URL or DATABASE_URL environment variable is missing.");
  process.exit(0);
}

async function main() {
  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== STORAGE SCHEMAS & TABLES ===");
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    ORDER BY table_name;
  `);
  console.log(tablesRes.rows.map(r => r.table_name));

  console.log("\n=== STORAGE BUCKETS (direct query) ===");
  try {
    const bRes = await client.query(`SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;`);
    console.log(JSON.stringify(bRes.rows, null, 2));
  } catch (e) {
    console.log("Error querying storage.buckets:", e.message);
  }

  console.log("\n=== STORAGE POLICIES ===");
  try {
    const pRes = await client.query(`
      SELECT policyname, tablename, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'storage';
    `);
    console.log(JSON.stringify(pRes.rows, null, 2));
  } catch (e) {
    console.log("Error querying storage policies:", e.message);
  }

  console.log("\n=== MENU ITEM FK DETAILED CHECK ===");
  // Check orphaned menu items
  const orphanRes = await client.query(`
    SELECT mi.id, mi.name, mi.category_id, mi.restaurant_id, mi.tenant_id
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mc.id IS NULL;
  `);
  console.log("Orphaned menu items (count):", orphanRes.rows.length);
  if (orphanRes.rows.length > 0) {
    console.log("Orphans:", JSON.stringify(orphanRes.rows, null, 2));
  }

  // Check matching restaurant_id and tenant_id between menu_items and menu_categories
  const matchRes = await client.query(`
    SELECT mi.id AS item_id, mi.name AS item_name, mi.restaurant_id AS item_rest, mc.restaurant_id AS cat_rest, mi.tenant_id AS item_tenant, mc.tenant_id AS cat_tenant
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mi.restaurant_id != mc.restaurant_id OR mi.tenant_id != mc.tenant_id;
  `);
  console.log("Mismatched tenant/restaurant categories (count):", matchRes.rows.length);
  if (matchRes.rows.length > 0) {
    console.log("Mismatches:", JSON.stringify(matchRes.rows, null, 2));
  }

  // Check if category_id is unique globally or nullable
  const colRes = await client.query(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'category_id';
  `);
  console.log("category_id column spec:", JSON.stringify(colRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
