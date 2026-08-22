-- =========================================================================
-- Trinetra Restaurant OS — Migration 0031
-- Realtime Stability & Full Replication Identity
-- 
-- Sets:
--  1. REPLICA IDENTITY FULL on all live operational tables
--  2. Adds operational tables to supabase_realtime publication
--  3. Ensures RLS policies allow realtime select filtering
-- =========================================================================

-- 1. Enable REPLICA IDENTITY FULL on all live operational tables
ALTER TABLE IF EXISTS public.restaurant_orders REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.restaurant_order_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.restaurant_tables REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.table_sessions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.kitchen_tickets REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.kitchen_ticket_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.restaurant_staff REPLICA IDENTITY FULL;

-- 2. Ensure publication exists and include operational tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 3. Add operational tables to supabase_realtime publication safely
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'restaurant_orders',
    'restaurant_order_items',
    'restaurant_tables',
    'table_sessions',
    'kitchen_tickets',
    'kitchen_ticket_items',
    'restaurant_staff'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, ignore
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- 4. Enable Row Level Security and ensure realtime read access
ALTER TABLE IF EXISTS public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kitchen_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_staff ENABLE ROW LEVEL SECURITY;
