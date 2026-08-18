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
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const colRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_orders'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(colRes.rows, null, 2));

  // Check sample existing orders
  const sampleRes = await client.query(`
    SELECT * FROM public.restaurant_orders LIMIT 5;
  `);
  console.log("\nSample Orders in DB:");
  console.log(JSON.stringify(sampleRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
