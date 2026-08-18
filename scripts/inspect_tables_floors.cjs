const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('--- 1. Check restaurant_tables columns and data ---');
  const { data: tables, error: tableErr } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, floor_id, restaurant_floors(id, name)')
    .order('table_number');
  
  if (tableErr) {
    console.error('Table error:', tableErr);
  } else {
    console.log(`Found ${tables.length} tables:`);
    console.table(tables.map(t => ({
      id: t.id,
      number: t.table_number,
      floor_id: t.floor_id,
      floor_name: t.restaurant_floors?.name
    })));
  }

  console.log('\n--- 2. Check restaurant_floors ---');
  const { data: floors, error: floorErr } = await supabase
    .from('restaurant_floors')
    .select('*')
    .order('display_order');
  
  if (floorErr) {
    console.error('Floor error:', floorErr);
  } else {
    console.log(`Found ${floors.length} floors:`);
    console.table(floors.map(f => ({
      id: f.id,
      name: f.name,
      restaurant_id: f.restaurant_id,
      order: f.display_order
    })));
  }
}

main().catch(console.error);
