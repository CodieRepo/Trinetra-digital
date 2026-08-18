const fs = require('fs');
const path = require('path');
const pg = require('pg');
const { Client } = pg;

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

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("=== 1. RESTAURANT_ORDERS COLUMNS ===");
  const colRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_orders'
    ORDER BY ordinal_position;
  `);
  console.table(colRes.rows);

  console.log("\n=== 2. RESTAURANT_ORDERS CONSTRAINTS & FOREIGN KEYS ===");
  const fkRes = await client.query(`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'restaurant_orders';
  `);
  console.table(fkRes.rows);

  console.log("\n=== 3. RESTAURANT_ORDERS INDEXES ===");
  const idxRes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'restaurant_orders';
  `);
  console.table(idxRes.rows);

  console.log("\n=== 4. RESTAURANT_STAFF COLUMNS & DATA ===");
  const staffColRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_staff'
    ORDER BY ordinal_position;
  `);
  console.table(staffColRes.rows);

  console.log("\n=== 5. RESTAURANT_ORDERS RLS POLICIES ===");
  const rlsRes = await client.query(`
    SELECT polname, polcmd, polroles::text, polqual, polwithcheck
    FROM pg_policy
    WHERE polrelid = 'public.restaurant_orders'::regclass;
  `);
  console.table(rlsRes.rows);

  await client.end();
}

main().catch(console.error);
