const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
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
const JWT_SECRET = process.env.JWT_SECRET || 'trinetra-pos-terminal-secret-key-2026';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_TENANT_ID = '1ab21b6e-d5ea-4395-81e4-ba2d06907194';
const DEMO_RESTAURANT_ID = 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createTestStaffJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 3600 * 8;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

const ARTIFACT_DIR = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\ca67c2b3-3319-4764-a315-6487ace6dbb8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('--- Capturing Real KDS Browser Screenshots ---');

  // 1. Get or create a kitchen staff member
  const { data: staff } = await supabase
    .from('restaurant_staff')
    .select('id, name, role')
    .eq('tenant_id', DEMO_TENANT_ID)
    .eq('restaurant_id', DEMO_RESTAURANT_ID)
    .limit(1);

  const staffId = staff && staff[0] ? staff[0].id : '00000000-0000-0000-0000-000000000001';
  const token = createTestStaffJwt({
    staff_id: staffId,
    restaurant_id: DEMO_RESTAURANT_ID,
    tenant_id: DEMO_TENANT_ID,
    staff_name: 'Anita Roy',
    role: 'kitchen',
  });

  const url = `http://localhost:3001/kitchen/${DEMO_RESTAURANT_ID}?token=${token}&role=kitchen`;
  console.log('Target URL:', url);

  const viewports = [
    { name: 'kds_tablet_portrait_768x1024.png', w: 768, h: 1024 },
    { name: 'kds_tablet_landscape_1024x768.png', w: 1024, h: 768 },
    { name: 'kds_desktop_1280x800.png', w: 1280, h: 800 },
  ];

  for (const vp of viewports) {
    const outPath = path.join(ARTIFACT_DIR, vp.name);
    console.log(`Capturing ${vp.name} (${vp.w}x${vp.h})...`);
    const cmd = `"${CHROME_PATH}" --headless=new --host-resolver-rules="MAP cdn.cookiehub.eu 127.0.0.1" --screenshot="${outPath}" --window-size=${vp.w},${vp.h} --virtual-time-budget=6000 "${url}"`;
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
