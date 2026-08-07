const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function checkOwners() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public';");
  console.log(res.rows);
  await client.end();
}

checkOwners().catch(console.error);
