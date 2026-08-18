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
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== TABLE OWNERS ===");
  const res = await client.query(`
    SELECT
      c.relname AS table_name,
      r.rolname AS owner_name
    FROM pg_class c
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE c.relname IN ('restaurant_tables', 'restaurant_floors', 'restaurants', 'tenants', 'menu_items');
  `);
  console.log(res.rows);

  console.log("\n=== CURRENT USER & ROLES ===");
  const userRes = await client.query(`SELECT current_user, session_user;`);
  console.log(userRes.rows);

  const memberships = await client.query(`
    SELECT r.rolname, m.roleid, (SELECT rolname FROM pg_roles WHERE oid = m.roleid) as member_of
    FROM pg_roles r
    LEFT JOIN pg_auth_members m ON m.member = r.oid
    WHERE r.rolname = current_user;
  `);
  console.log('\n=== CURRENT USER MEMBERSHIPS ===', memberships.rows);

  await client.end();
}

main().catch(console.error);
