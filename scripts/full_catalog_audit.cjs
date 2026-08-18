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

async function fullCatalogAudit() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tables = [
    'restaurant_staff',
    'restaurant_staff_pins',
    'restaurant_terminals',
    'terminal_sessions',
    'staff_roles',
    'auth_audit_logs'
  ];

  for (const t of tables) {
    console.log(`\n================== TABLE: ${t} ==================`);
    const exists = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1;
    `, [t]);
    if (exists.rows.length === 0) {
      console.log(`Table ${t} DOES NOT EXIST in public schema.`);
      continue;
    }

    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.table(cols.rows);

    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = $1::regclass;
    `, [t]);
    console.table(constraints.rows);

    const rls = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1;
    `, [t]);
    console.table(rls.rows);
  }

  // Check unique roles currently existing in restaurant_staff
  const rolesInDb = await client.query(`
    SELECT role, count(*) FROM public.restaurant_staff GROUP BY role;
  `);
  console.log("\nDistinct roles in restaurant_staff table:");
  console.table(rolesInDb.rows);

  await client.end();
}

fullCatalogAudit().catch(console.error);
