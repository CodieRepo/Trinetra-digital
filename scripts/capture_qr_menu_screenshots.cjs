const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Environment Loading ─────────────────────────────────────────────────────
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
  console.log('--- Capturing Real Customer QR Menu Browser Screenshots ---');

  // 1. Fetch demo restaurant and table token for T-1
  const { data: demoRest } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', '%Spice Garden%')
    .limit(1)
    .single();

  const restId = demoRest?.id;
  const { data: demoTable } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, table_token, restaurant_id')
    .eq('restaurant_id', restId)
    .eq('table_number', 'T-1')
    .single();

  const tableToken = demoTable?.table_token;
  const url = `http://localhost:3001/r/${tableToken}?browse=1`;
  console.log('Target URL:', url);
  console.log(`Restaurant: ${demoRest?.name}, Table: ${demoTable?.table_number}`);

  const viewports = [
    { name: 'customer_qr_menu_mobile_390x844.png', w: 390, h: 844 },
    { name: 'customer_qr_menu_tablet_768x1024.png', w: 768, h: 1024 },
    { name: 'customer_qr_menu_desktop_1280x800.png', w: 1280, h: 800 },
  ];

  for (const vp of viewports) {
    const outPath = path.join(ARTIFACT_DIR, vp.name);
    console.log(`Capturing ${vp.name} (${vp.w}x${vp.h})...`);
    const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --no-sandbox --host-resolver-rules="MAP cdn.cookiehub.eu 127.0.0.1" --screenshot="${outPath}" --window-size=${vp.w},${vp.h} --virtual-time-budget=4000 "${url}"`;
    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`  ✓ Saved: ${outPath}`);
    } catch (e) {
      console.error(`  ❌ Failed capturing ${vp.name}:`, e.message);
    }
  }

  console.log('--- Screenshots Capture Complete ---');
}

main().catch(console.error);
