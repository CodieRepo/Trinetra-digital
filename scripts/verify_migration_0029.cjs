const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function verifyMigration() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log("✅ Sent PostgREST reload schema signal.");

  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_orders'
      AND column_name IN ('created_by_staff_id', 'order_source');
  `);
  console.log("New columns in restaurant_orders:");
  console.table(cols.rows);

  const idxs = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'restaurant_orders'
      AND indexname IN ('idx_restaurant_orders_source', 'idx_restaurant_orders_staff');
  `);
  console.log("New indexes on restaurant_orders:");
  console.table(idxs.rows);

  await client.end();
}

verifyMigration().catch(console.error);
