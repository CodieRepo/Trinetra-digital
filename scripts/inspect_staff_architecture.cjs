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

async function inspectStaffArchitecture() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("=== 1. TABLES DISCOVERY ===");
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name LIKE '%staff%' OR table_name LIKE '%terminal%' OR table_name LIKE '%pin%' OR table_name LIKE '%device%' OR table_name LIKE '%role%')
    ORDER BY table_name;
  `);
  console.log("Matching tables:", tablesRes.rows.map(r => r.table_name));

  for (const row of tablesRes.rows) {
    const tableName = row.table_name;
    console.log(`\n--- Table: ${tableName} ---`);
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    console.table(cols.rows);

    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = $1::regclass;
    `, [tableName]);
    console.log("Constraints:");
    console.table(constraints.rows);

    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1;
    `, [tableName]);
    console.log("Indexes:");
    console.table(indexes.rows);

    const rls = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1;
    `, [tableName]);
    console.log("RLS Policies:");
    console.table(rls.rows);
  }

  console.log("\n=== 2. RPC FUNCTIONS AUDIT ===");
  const funcs = await client.query(`
    SELECT proname, prosrc
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (proname LIKE '%pin%' OR proname LIKE '%staff%' OR proname LIKE '%terminal%' OR proname LIKE '%auth%');
  `);
  console.log(`Found ${funcs.rows.length} RPC functions:`);
  for (const f of funcs.rows) {
    console.log(`\nFunction: ${f.proname}`);
    console.log(f.prosrc);
  }

  console.log("\n=== 3. LIVE STAFF DATA SAMPLE ===");
  const staffSample = await client.query(`
    SELECT id, tenant_id, restaurant_id, name, role, is_active, created_at, 
           CASE WHEN access_token IS NOT NULL THEN 'PRESENT' ELSE 'NULL' END as token_status
    FROM public.restaurant_staff
    LIMIT 10;
  `);
  console.table(staffSample.rows);

  await client.end();
}

inspectStaffArchitecture().catch(console.error);
