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

async function auditHistoricalOrders() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("=== HISTORICAL ORDERS AUDIT ===");
  const countRes = await client.query(`SELECT COUNT(*) as total_orders FROM public.restaurant_orders;`);
  console.log(`Total orders currently in database: ${countRes.rows[0].total_orders}`);

  const rowsRes = await client.query(`
    SELECT id, tenant_id, restaurant_id, table_id, table_session_id, status, total_amount, created_at
    FROM public.restaurant_orders
    ORDER BY created_at DESC;
  `);
  console.table(rowsRes.rows);

  await client.end();
}

auditHistoricalOrders().catch(console.error);
