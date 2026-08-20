const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  console.log('--- Capturing Real H-5B Customer Order Tracker Screenshots ---');

  // 1. Fetch demo restaurant and Table T-1
  const { data: demoRest } = await supabase
    .from('restaurants')
    .select('id, tenant_id, name')
    .ilike('name', '%Spice Garden%')
    .limit(1)
    .single();

  const { data: demoTable } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, table_token, floor_id')
    .eq('restaurant_id', demoRest.id)
    .eq('table_number', 'T-1')
    .single();

  // 2. Fetch or create a live active order for T-1
  const sessionToken = crypto.randomUUID();
  let tableSessionId = null;

  const { data: activeSession } = await supabase
    .from('restaurant_table_sessions')
    .select('id')
    .eq('table_id', demoTable.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (activeSession) {
    tableSessionId = activeSession.id;
    await supabase
      .from('restaurant_table_sessions')
      .update({ session_token: sessionToken, payment_status: 'unpaid' })
      .eq('id', tableSessionId);
  } else {
    const { data: newSess } = await supabase
      .from('restaurant_table_sessions')
      .insert({
        tenant_id: demoRest.tenant_id,
        restaurant_id: demoRest.id,
        table_id: demoTable.id,
        session_token: sessionToken,
        status: 'active',
        payment_status: 'unpaid',
      })
      .select('id')
      .single();
    tableSessionId = newSess?.id;
  }

  // Fetch sample items
  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('restaurant_id', demoRest.id)
    .limit(2);

  // Insert Order #1
  const { data: order1 } = await supabase
    .from('restaurant_orders')
    .insert({
      tenant_id: demoRest.tenant_id,
      restaurant_id: demoRest.id,
      table_id: demoTable.id,
      table_session_id: tableSessionId,
      session_token: sessionToken,
      status: 'preparing',
      notes: 'Less spicy, serve with mint chutney',
      total_amount: (items[0]?.price || 340) * 2,
      order_source: 'qr',
    })
    .select('id')
    .single();

  await supabase.from('restaurant_order_items').insert([
    {
      tenant_id: demoRest.tenant_id,
      order_id: order1.id,
      menu_item_id: items[0]?.id,
      name: items[0]?.name || 'Murgh Malai Tikka',
      price: items[0]?.price || 340,
      quantity: 2,
      notes: 'Less spicy',
    },
  ]);

  // Insert Order #2
  const { data: order2 } = await supabase
    .from('restaurant_orders')
    .insert({
      tenant_id: demoRest.tenant_id,
      restaurant_id: demoRest.id,
      table_id: demoTable.id,
      table_session_id: tableSessionId,
      session_token: sessionToken,
      status: 'placed',
      notes: 'Crispy well-done',
      total_amount: (items[1]?.price || 290) * 1,
      order_source: 'qr',
    })
    .select('id')
    .single();

  await supabase.from('restaurant_order_items').insert([
    {
      tenant_id: demoRest.tenant_id,
      order_id: order2.id,
      menu_item_id: items[1]?.id,
      name: items[1]?.name || 'Tandoori Paneer Angare',
      price: items[1]?.price || 290,
      quantity: 1,
      notes: 'Crispy',
    },
  ]);

  const targetUrl = `http://localhost:3001/r/${demoTable.table_token}/order/${order1.id}?session_token=${sessionToken}`;
  console.log('Target URL:', targetUrl);

  // We can inject localStorage via chrome user-data-dir script or curl
  // In Next.js client component, OrderStatus will read session_token from localStorage or if we pass it, or we use puppeteer/chrome profile.
  // Let's create a small helper script to capture page with localStorage injected
  const viewports = [
    { name: 'customer_order_tracker_mobile_390x844.png', w: 390, h: 844 },
    { name: 'customer_order_tracker_tablet_768x1024.png', w: 768, h: 1024 },
  ];

  // For clean headless chrome screenshot, we can create a temporary chrome user data directory with Local Storage or use evaluate
  // Or since OrderStatus reads window.localStorage.getItem("akuafi:restaurant:session-token"), let's pass a small script
  for (const vp of viewports) {
    const outPath = path.join(ARTIFACT_DIR, vp.name);
    console.log(`Capturing ${vp.name} (${vp.w}x${vp.h})...`);
    // Using chrome with virtual-time-budget
    const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --no-sandbox --host-resolver-rules="MAP cdn.cookiehub.eu 127.0.0.1" --screenshot="${outPath}" --window-size=${vp.w},${vp.h} --virtual-time-budget=4000 "${targetUrl}"`;
    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`  ✓ Saved: ${outPath}`);
    } catch (e) {
      console.error(`  ❌ Failed:`, e.message);
    }
  }

  console.log('--- H-5B Screenshots Complete ---');
}

main().catch(console.error);
