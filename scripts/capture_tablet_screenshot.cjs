const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envFiles = ['.env.production', '.env.local', '.env'];
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ARTIFACT_DIR = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\ca67c2b3-3319-4764-a315-6487ace6dbb8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const { data: demoRest } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', '%Spice Garden%')
    .limit(1)
    .single();

  const { data: demoTable } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, table_token')
    .eq('restaurant_id', demoRest.id)
    .eq('table_number', 'T-1')
    .single();

  const url = `http://localhost:3001/r/${demoTable.table_token}?browse=1`;
  const outPath = path.join(ARTIFACT_DIR, 'customer_qr_menu_tablet_768x1024.png');

  console.log(`Capturing Tablet ${url} -> ${outPath}...`);
  const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --no-sandbox --host-resolver-rules="MAP cdn.cookiehub.eu 127.0.0.1" --screenshot="${outPath}" --window-size=768,1024 --virtual-time-budget=4000 "${url}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('✓ Saved Tablet screenshot.');
}

main().catch(console.error);
