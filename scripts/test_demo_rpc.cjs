const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/);
    if (match) process.env[match[1]] = match[2];
  });
}

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Testing seed_demo_restaurant_rpc...');
  const res = await supabaseAdmin.rpc('seed_demo_restaurant_rpc');
  console.log('Demo Seeder RPC Result:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
