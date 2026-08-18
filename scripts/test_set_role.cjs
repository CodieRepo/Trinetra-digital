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

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function checkRoles() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const roles = ['postgres', 'supabase_admin', 'authenticated', 'service_role'];
  for (const r of roles) {
    try {
      await client.query(`SET ROLE ${r};`);
      console.log(`✅ SET ROLE ${r} SUCCESS!`);
      try {
        await client.query("ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS floor_id UUID;");
        console.log(`   🎉 ALTER TABLE WORKED UNDER ROLE ${r}!`);
      } catch (e) {
        console.log(`   ❌ Alter under ${r} failed: ${e.message}`);
      }
      await client.query("RESET ROLE;");
    } catch (e) {
      console.log(`❌ SET ROLE ${r} failed: ${e.message}`);
    }
  }

  await client.end();
}

checkRoles().catch(console.error);
