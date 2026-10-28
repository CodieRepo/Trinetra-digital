import pg from "pg";
import fs from "fs";

function loadEnv() {
  const content = fs.readFileSync(".env", "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = (m[2] || "").trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[m[1]] = val;
    }
  }
}

loadEnv();

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL direct database!");

  const sql = fs.readFileSync("supabase/migrations/0033_fix_multitenant_phone_isolation.sql", "utf8");
  console.log("Applying 0033_fix_multitenant_phone_isolation.sql...");

  await client.query(sql);
  console.log("✅ Successfully applied 0033_fix_multitenant_phone_isolation.sql!");

  await client.end();
}

run().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
