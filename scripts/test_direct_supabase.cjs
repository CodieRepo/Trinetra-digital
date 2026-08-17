const pg = require('pg');
const { Client } = pg;

async function testDirectHost() {
  const url = "postgresql://postgres:TrinetraDB2026!@db.suvuvxdasccmztbbpreg.supabase.co:5432/postgres";
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("SUCCESS: Connected directly to db.suvuvxdasccmztbbpreg.supabase.co as postgres!");
    const res = await client.query("SELECT current_user;");
    console.log("Current user:", res.rows[0].current_user);
    await client.end();
  } catch(e) {
    console.error("Direct host connection failed:", e.message);
  }
}

testDirectHost();
