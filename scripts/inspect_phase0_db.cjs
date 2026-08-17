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
  console.log("Connected to DB successfully.\n");

  // 1. Inspect ALL foreign keys on menu_items
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

  // 2. Inspect columns of restaurant_orders, restaurant_order_items, restaurant_bills, restaurant_profiles, restaurant_settings, restaurant_staff, notifications, audit_logs
  const restaurantTables = [
    'restaurant_orders', 'restaurant_order_items', 'restaurant_bills',
    'restaurant_profiles', 'restaurant_settings', 'restaurant_staff',
    'restaurant_staff_pins', 'restaurant_order_events', 'restaurant_tables',
    'restaurant_table_sessions', 'restaurant_discount_audit', 'restaurant_feature_flags',
    'notifications', 'audit_logs', 'message_events'
  ];
  for (const table of restaurantTables) {
    console.log(`\n=== COLUMNS FOR ${table} ===`);
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    if (colRes.rows.length === 0) {
      console.log(`Table ${table} does NOT exist.`);
    } else {
      console.log(colRes.rows.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join('\n'));
    }
  }

  // 3. Inspect data in restaurant_orders
  console.log("\n=== DATA IN restaurant_orders ===");
  const rOrders = await client.query(`
    SELECT *
    FROM restaurant_orders
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(rOrders.rows, null, 2));

  // 4. Inspect data in orders (legacy or active?)
  console.log("\n=== DATA IN orders ===");
  const orders = await client.query(`
    SELECT *
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(orders.rows, null, 2));

  // 5. Inspect data in restaurant_table_sessions
  console.log("\n=== DATA IN restaurant_table_sessions ===");
  const sessions = await client.query(`
    SELECT *
    FROM restaurant_table_sessions
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(sessions.rows, null, 2));

  // 6. Inspect data in restaurant_bills
  console.log("\n=== DATA IN restaurant_bills ===");
  const bills = await client.query(`
    SELECT *
    FROM restaurant_bills
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  console.log(JSON.stringify(bills.rows, null, 2));

  // 7. Check RLS policies on restaurant_* and menu_* tables
  console.log("\n=== RLS POLICIES FOR RESTAURANT & MENU TABLES ===");
  const rlsRes = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename LIKE 'restaurant%' OR tablename LIKE 'menu%' OR tablename IN ('orders', 'categories'))
    ORDER BY tablename, policyname;
  `);
  console.log(JSON.stringify(rlsRes.rows, null, 2));

  // 8. Check indexes
  console.log("\n=== INDEXES FOR RESTAURANT & MENU TABLES ===");
  const idxRes = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'restaurant%' OR tablename LIKE 'menu%' OR tablename IN ('orders', 'categories'))
    ORDER BY tablename, indexname;
  `);
  console.log(JSON.stringify(idxRes.rows, null, 2));

  // 9. Inspect restaurants & tenants records
  console.log("\n=== DATA IN restaurants ===");
  const restRes = await client.query(`SELECT * FROM restaurants LIMIT 5;`);
  console.log(JSON.stringify(restRes.rows, null, 2));

  console.log("\n=== DATA IN tenants ===");
  const tenantRes = await client.query(`SELECT * FROM tenants LIMIT 5;`);
  console.log(JSON.stringify(tenantRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
