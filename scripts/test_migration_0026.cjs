const fs = require('fs');
const path = require('path');
const pg = require('pg');
const { Client } = pg;

function loadEnv() {
  if (process.env.DIRECT_URL || process.env.DATABASE_URL) return;
  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) process.env[match[1]] = match[2];
    }
  } catch (e) {}
}

loadEnv();

const migrationSql = `
-- Migration 0026: Canonical menu_items to menu_categories FK with RESTRICT and Cross-Restaurant Enforcement
DO $$
DECLARE
  v_orphan_count INTEGER;
  v_mismatch_count INTEGER;
BEGIN
  -- 1. Preflight Check: Orphaned menu_items
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.menu_items mi
  LEFT JOIN public.menu_categories mc ON mi.category_id = mc.id
  WHERE mc.id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Found % orphaned menu_items referencing non-existent categories.', v_orphan_count;
  END IF;

  -- 2. Preflight Check: Restaurant Mismatches
  SELECT COUNT(*) INTO v_mismatch_count
  FROM public.menu_items mi
  JOIN public.menu_categories mc ON mi.category_id = mc.id
  WHERE mi.restaurant_id IS DISTINCT FROM mc.restaurant_id;

  IF v_mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Found % menu_items with restaurant_id mismatching parent category.', v_mismatch_count;
  END IF;
END $$;

-- 3. Ensure menu_categories has a unique constraint on (id, restaurant_id) for composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_categories_id_restaurant_id_key'
  ) THEN
    ALTER TABLE public.menu_categories ADD CONSTRAINT menu_categories_id_restaurant_id_key UNIQUE (id, restaurant_id);
  END IF;
END $$;

-- 4. Re-create foreign key with ON DELETE RESTRICT and cross-restaurant verification
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id, restaurant_id)
  REFERENCES public.menu_categories(id, restaurant_id)
  ON DELETE RESTRICT;
`;

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected to DB. Applying Migration 0026...");

  await client.query(migrationSql);
  console.log("SUCCESS: Migration 0026 applied to production DB.");

  await client.end();
}

main().catch(err => {
  console.error("Migration execution failed:", err);
  process.exit(1);
});
