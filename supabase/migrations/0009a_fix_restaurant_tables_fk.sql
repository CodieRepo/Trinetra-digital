-- =========================================================================
-- Fix Foreign Key Constraints for Restaurant Tables, Sessions & Orders
-- Migration: 0009_fix_restaurant_tables_fk.sql
-- =========================================================================

-- 1. Make table_id nullable on restaurant_orders
ALTER TABLE public.restaurant_orders ALTER COLUMN table_id DROP NOT NULL;

-- 2. Drop existing foreign key on restaurant_orders.table_id and re-create with CASCADE
ALTER TABLE public.restaurant_orders 
  DROP CONSTRAINT IF EXISTS restaurant_orders_table_id_fkey;

ALTER TABLE public.restaurant_orders 
  ADD CONSTRAINT restaurant_orders_table_id_fkey 
  FOREIGN KEY (table_id) 
  REFERENCES public.restaurant_tables(id) 
  ON DELETE CASCADE;

-- 3. Drop existing foreign key on restaurant_orders.table_session_id and re-create with CASCADE
ALTER TABLE public.restaurant_orders 
  DROP CONSTRAINT IF EXISTS restaurant_orders_table_session_id_fkey;

ALTER TABLE public.restaurant_orders 
  ADD CONSTRAINT restaurant_orders_table_session_id_fkey 
  FOREIGN KEY (table_session_id) 
  REFERENCES public.restaurant_table_sessions(id) 
  ON DELETE CASCADE;

-- 4. Drop existing foreign key on restaurant_table_sessions.table_id and re-create with CASCADE
ALTER TABLE public.restaurant_table_sessions 
  DROP CONSTRAINT IF EXISTS restaurant_table_sessions_table_id_fkey;

ALTER TABLE public.restaurant_table_sessions 
  ADD CONSTRAINT restaurant_table_sessions_table_id_fkey 
  FOREIGN KEY (table_id) 
  REFERENCES public.restaurant_tables(id) 
  ON DELETE CASCADE;
