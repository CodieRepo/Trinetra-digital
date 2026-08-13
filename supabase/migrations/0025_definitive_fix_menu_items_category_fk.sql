-- Migration: 0025_definitive_fix_menu_items_category_fk.sql
-- Definitive fix for menu_items.category_id foreign key constraint

DO $$
DECLARE
  fk_record RECORD;
  orphan_count INTEGER := 0;
  fk_count INTEGER := 0;
BEGIN
  -- 1. Query and report all existing FK constraints on public.menu_items.category_id
  RAISE NOTICE '=== Checking existing Foreign Key constraints on public.menu_items(category_id) ===';
  FOR fk_record IN
    SELECT
      con.conname AS constraint_name,
      ref.relname AS target_table
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_class ref ON ref.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'menu_items'
      AND con.contype = 'f'
      AND att.attname = 'category_id'
  LOOP
    fk_count := fk_count + 1;
    RAISE NOTICE 'Found FK constraint #: % -> % (points to table: %)', fk_count, fk_record.constraint_name, fk_record.target_table;
  END LOOP;

  IF fk_count = 0 THEN
    RAISE NOTICE 'No existing FK constraints found on public.menu_items(category_id).';
  END IF;

  -- 2. Check for orphan menu_items.category_id values that do not exist in public.menu_categories(id)
  SELECT COUNT(*) INTO orphan_count
  FROM public.menu_items mi
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_categories mc WHERE mc.id = mi.category_id
  );

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Found % orphan menu_items row(s) whose category_id does not exist in public.menu_categories(id). Please resolve these rows manually before applying this migration.', orphan_count;
  ELSE
    RAISE NOTICE 'Orphan check passed: 0 orphan menu_items found.';
  END IF;

  -- 3. Drop every FK constraint on menu_items.category_id using pg_constraint introspection
  FOR fk_record IN
    SELECT con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'menu_items'
      AND con.contype = 'f'
      AND att.attname = 'category_id'
  LOOP
    RAISE NOTICE 'Dropping constraint: %', fk_record.constraint_name;
    EXECUTE format('ALTER TABLE public.menu_items DROP CONSTRAINT %I', fk_record.constraint_name);
  END LOOP;

  -- 4. Recreate exactly one canonical FK constraint to public.menu_categories(id)
  RAISE NOTICE 'Adding canonical FK constraint menu_items_category_id_fkey -> public.menu_categories(id)...';
  ALTER TABLE public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE CASCADE;

  RAISE NOTICE '=== Migration 0025 successfully completed ===';
END $$;
