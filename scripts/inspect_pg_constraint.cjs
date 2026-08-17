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

  console.log("=== PG_CONSTRAINT DIRECT CATALOG INSPECTION FOR menu_items ===");
  const pgRes = await client.query(`
    SELECT
      con.conname AS constraint_name,
      con.contype AS constraint_type,
      rel.relname AS source_table,
      frel.relname AS target_table,
      pg_get_constraintdef(con.oid) AS constraint_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    LEFT JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE rel.relname = 'menu_items';
  `);
  console.log(JSON.stringify(pgRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
