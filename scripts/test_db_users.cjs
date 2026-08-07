const { Client } = require('pg');
const pass = 'TrinetraDB2026!';
const host = 'aws-1-ap-northeast-1.pooler.supabase.com';
const users = [
  'postgres.suvuvxdasccmztbbpreg',
  'postgres',
  'supabase_admin.suvuvxdasccmztbbpreg',
  'supabase_admin',
  'service_role.suvuvxdasccmztbbpreg',
  'authenticator.suvuvxdasccmztbbpreg'
];

async function testUsers() {
  for (const user of users) {
    for (const port of [5432, 6543]) {
      const url = `postgresql://${user}:${pass}@${host}:${port}/postgres`;
      const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
      try {
        await client.connect();
        console.log(`SUCCESS: Connected as ${user} on port ${port}`);
        await client.end();
      } catch(e) {
        // silent fail
      }
    }
  }
}

testUsers().catch(console.error);
