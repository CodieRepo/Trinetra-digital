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

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== TABLE OWNERSHIP INSPECTION ===");
  const res = await client.query(`
    SELECT
      c.relname AS table_name,
      r.rolname AS owner_name
    FROM pg_class c
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE c.relname IN ('menu_items', 'menu_categories', 'restaurants', 'tenants');
  `);
  console.log(JSON.stringify(res.rows, null, 2));

  console.log("\n=== CURRENT USER & ROLES ===");
  const userRes = await client.query(`SELECT current_user, session_user;`);
  console.log(JSON.stringify(userRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
