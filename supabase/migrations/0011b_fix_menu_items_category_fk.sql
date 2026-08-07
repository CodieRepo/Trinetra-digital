-- Migration: 0011_fix_menu_items_category_fk.sql
-- Fix menu_items.category_id FK to point to menu_categories(id) instead of legacy categories(id)

ALTER TABLE public.menu_items 
  DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

ALTER TABLE public.menu_items 
  ADD CONSTRAINT menu_items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE CASCADE;
