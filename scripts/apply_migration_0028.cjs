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

// Use postgres owner connection
const ownerUrl = process.env.POSTGRES_OWNER_URL || "postgresql://postgres.suvuvxdasccmztbbpreg:TrinetraDB2026!@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function run() {
  console.log('Connecting as postgres owner...');
  const pgClient = new Client({
    connectionString: ownerUrl,
    ssl: { rejectUnauthorized: false },
  });

  await pgClient.connect();
  console.log('✅ Connected as table owner (postgres).');

  const migrationPath = path.join(__dirname, '../supabase/migrations/0028_restaurant_tables_persistent_floor_id.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('\nExecuting Migration 0028:');
  await pgClient.query(sql);
  console.log('✅ Migration 0028 executed successfully.');

  // Ensure permissions for trinetra_app / authenticated / service_role
  await pgClient.query("GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO trinetra_app, authenticated, service_role;");
  console.log('✅ Permissions granted on restaurant_tables.');

  // Reload PostgREST schema cache so foreign key relationships are recognized immediately
  await pgClient.query("NOTIFY pgrst, 'reload schema';");
  console.log('✅ PostgREST schema cache reload signal sent.');

  // Verify column existence and backfill
  const checkRes = await pgClient.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_tables' AND column_name = 'floor_id';
  `);
  console.log('\nColumn check:', checkRes.rows);

  const tablesRes = await pgClient.query(`
    SELECT t.table_number, t.floor_id, f.name as floor_name
    FROM public.restaurant_tables t
    LEFT JOIN public.restaurant_floors f ON t.floor_id = f.id
    ORDER BY t.table_number;
  `);
  console.log('\nAll tables with floor assignment:');
  console.table(tablesRes.rows);

  await pgClient.end();
}

run().catch((err) => {
  console.error('❌ Error executing migration:', err);
  process.exit(1);
});
