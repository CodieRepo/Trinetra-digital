-- =========================================================================
-- Trinetra Restaurant OS — Migration 0029
-- P0 Fix: Order Source & Staff Attribution Operational Context
-- 
-- Adds:
--  1. created_by_staff_id (FK to restaurant_staff, ON DELETE SET NULL)
--  2. order_source (CHECK in 'qr', 'waiter', 'pos', 'kiosk')
--  3. Composite indexes for source and staff filtering
--
-- Safety: Additive only. Nullable columns. No historical data is altered or guessed.
-- Rollback: ALTER TABLE public.restaurant_orders DROP COLUMN IF EXISTS created_by_staff_id, DROP COLUMN IF EXISTS order_source;
-- =========================================================================

-- 1. Add created_by_staff_id referencing restaurant_staff
ALTER TABLE public.restaurant_orders
    ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES public.restaurant_staff(id) ON DELETE SET NULL;

-- 2. Add order_source with check constraint (nullable for historical integrity)
ALTER TABLE public.restaurant_orders
    ADD COLUMN IF NOT EXISTS order_source TEXT CHECK (order_source IN ('qr', 'waiter', 'pos', 'kiosk'));

-- 3. Composite tenant-isolated index for order source queries
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_source
    ON public.restaurant_orders(tenant_id, restaurant_id, order_source);

-- 4. Composite tenant-isolated index for staff-attributed orders
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_staff
    ON public.restaurant_orders(tenant_id, restaurant_id, created_by_staff_id)
    WHERE created_by_staff_id IS NOT NULL;
