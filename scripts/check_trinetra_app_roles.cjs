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

  console.log("=== ALL LOGIN ROLES IN DATABASE ===");
  const rolesRes = await client.query(`
    SELECT r.rolname, r.rolsuper, r.rolcreatedb, r.rolcanlogin
    FROM pg_roles r
    WHERE r.rolcanlogin = true;
  `);
  console.log(JSON.stringify(rolesRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
