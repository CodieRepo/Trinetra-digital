const pg = require('pg');
const { Client } = pg;

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.log("Skipping script: DIRECT_URL or DATABASE_URL environment variable is missing.");
  process.exit(0);
}

async function main() {
  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== BRANDING TABLES & COLUMNS ===");
  const tables = ['restaurants', 'tenants', 'restaurant_profiles', 'restaurant_settings', 'tenant_settings'];
  for (const table of tables) {
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    console.log(`\nTable: ${table}`);
    if (colRes.rows.length === 0) {
      console.log(`  (does not exist)`);
    } else {
      console.log(colRes.rows.map(c => `  ${c.column_name}: ${c.data_type}`).join('\n'));
    }
  }

  console.log("\n=== STORAGE BUCKETS ===");
  try {
    const bucketRes = await client.query(`SELECT id, name, public FROM storage.buckets;`);
    console.log(JSON.stringify(bucketRes.rows, null, 2));
  } catch (err) {
    console.log("Error querying storage.buckets:", err.message);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
