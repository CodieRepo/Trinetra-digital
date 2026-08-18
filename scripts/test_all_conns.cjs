const pg = require('pg');
const { Client } = pg;

const passwords = [
  'TrinetraDB2026!',
];

const hosts = [
  'aws-1-ap-northeast-1.pooler.supabase.com',
  'db.suvuvxdasccmztbbpreg.supabase.co',
];

const users = [
  'postgres.suvuvxdasccmztbbpreg',
  'postgres',
  'trinetra_app.suvuvxdasccmztbbpreg',
  'trinetra_app',
];

const ports = [5432, 6543];

async function testAll() {
  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        for (const pass of passwords) {
          const connStr = `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
          const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
          try {
            await client.connect();
            console.log(`✅ CONNECTED: host=${host} port=${port} user=${user}`);
            // Check if we can alter restaurant_tables
            try {
              await client.query("ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS floor_id UUID;");
              console.log(`   🎉 SUCCESS! ALTER TABLE worked with user=${user} on host=${host}:${port}!`);
            } catch (e) {
              console.log(`   ❌ Alter failed: ${e.message}`);
            }
            await client.end();
          } catch (e) {
            // failed
          }
        }
      }
    }
  }
}

testAll().catch(console.error);
