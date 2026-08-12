-- Migration: 0024_fix_menu_items_category_fk_canonical.sql
-- Fix menu_items.category_id FK constraint to point directly to menu_categories(id)

DO $$ 
BEGIN
  -- 1. Drop old foreign key constraint if pointing to legacy categories table
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'menu_items_category_id_fkey' 
      AND table_name = 'menu_items'
  ) THEN
    ALTER TABLE public.menu_items DROP CONSTRAINT menu_items_category_id_fkey;
  END IF;

  -- 2. Add canonical foreign key constraint referencing menu_categories(id)
  ALTER TABLE public.menu_items 
    ADD CONSTRAINT menu_items_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE CASCADE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping menu_items_category_id_fkey alter: %', SQLERRM;
END $$;
