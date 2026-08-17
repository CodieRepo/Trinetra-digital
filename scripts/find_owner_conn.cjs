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

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function testConnectionRoles() {
  const urlObj = new URL(dbUrl);
  const pass = urlObj.password;
  const host = urlObj.hostname;

  const usersToTry = [
    'postgres',
    'postgres.suvuvxdasccmztbbpreg',
    'supabase_admin',
    'supabase_admin.suvuvxdasccmztbbpreg',
    'trinetra_app.suvuvxdasccmztbbpreg',
    'trinetra_app'
  ];

  for (const u of usersToTry) {
    const testUrl = `postgresql://${u}:${pass}@${host}:5432/postgres`;
    const client = new Client({ connectionString: testUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log(`SUCCESS connected as user: ${u}`);
      // Test if DDL works
      try {
        await client.query("ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;");
        console.log(`  ✓ User ${u} HAS DDL PERMISSION!`);
      } catch(e) {
        console.log(`  ❌ User ${u} DDL failed: ${e.message}`);
      }
      await client.end();
    } catch(e) {
      console.log(`Connection failed for user ${u}: ${e.message}`);
    }
  }
}

testConnectionRoles().catch(console.error);
