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

  console.log("=== 1. ALL FOREIGN KEYS ON menu_items ===");
  const fkRes = await client.query(`
    SELECT
      tc.constraint_name,
      tc.table_name AS source_table,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'menu_items';
  `);
  console.log(JSON.stringify(fkRes.rows, null, 2));

  console.log("\n=== 2. DATA IN restaurant_orders ===");
  const rOrders = await client.query(`
    SELECT *
    FROM restaurant_orders
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(rOrders.rows, null, 2));

  console.log("\n=== 3. DATA IN restaurant_table_sessions ===");
  const sessions = await client.query(`
    SELECT *
    FROM restaurant_table_sessions
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(sessions.rows, null, 2));

  console.log("\n=== 4. DATA IN restaurant_bills ===");
  const bills = await client.query(`
    SELECT *
    FROM restaurant_bills
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(bills.rows, null, 2));

  console.log("\n=== 5. DATA IN menu_categories vs categories ===");
  const mc = await client.query(`SELECT * FROM menu_categories LIMIT 10;`);
  console.log("menu_categories:", JSON.stringify(mc.rows, null, 2));
  const c = await client.query(`SELECT * FROM categories LIMIT 10;`);
  console.log("categories:", JSON.stringify(c.rows, null, 2));

  console.log("\n=== 6. DATA IN menu_items ===");
  const items = await client.query(`SELECT * FROM menu_items LIMIT 10;`);
  console.log("menu_items:", JSON.stringify(items.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
