const pg = require('pg');
const { Client } = pg;

async function testPooler6543() {
  const url = "postgresql://postgres.suvuvxdasccmztbbpreg:TrinetraDB2026!@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("SUCCESS: Connected as postgres.suvuvxdasccmztbbpreg on port 6543!");
    await client.end();
  } catch (e) {
    console.error("Port 6543 failed:", e.message);
  }
}

testPooler6543();
