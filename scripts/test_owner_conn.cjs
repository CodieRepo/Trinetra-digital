const pg = require('pg');
const { Client } = pg;

const ownerUrl = "postgresql://postgres.suvuvxdasccmztbbpreg:TrinetraDB2026!@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function testOwner() {
  const client = new Client({ connectionString: ownerUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("SUCCESS: Connected as postgres.suvuvxdasccmztbbpreg owner!");
    await client.end();
  } catch (e) {
    console.error("Owner connection failed:", e.message);
  }
}

testOwner();
