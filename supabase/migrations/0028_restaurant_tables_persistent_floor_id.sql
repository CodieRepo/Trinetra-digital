-- =========================================================================
-- Trinetra Restaurant OS — Migration 0028
-- P0 Fix: Persistent Floor-to-Table Association
-- 
-- Root Cause: Migration 0018 attempted to add floor_id and capacity via a DO/EXCEPTION
-- block that silently skipped when the executing role was not the table owner.
-- This migration adds the columns unconditionally.
--
-- Safety: Additive only. Nullable floor_id, defaulted capacity. No existing data is altered.
-- Rollback: ALTER TABLE public.restaurant_tables DROP COLUMN IF EXISTS floor_id, DROP COLUMN IF EXISTS capacity;
--          (Warning: dropping floor_id removes all persisted floor assignments)
-- =========================================================================

-- 1. Add floor_id and capacity columns to restaurant_tables (additive, safe for existing data)
ALTER TABLE public.restaurant_tables
    ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.restaurant_floors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0);

-- 2. Composite tenant-isolated index for floor-scoped table lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_floor
    ON public.restaurant_tables(tenant_id, restaurant_id, floor_id);

-- 3. Deterministic backfill: assign known demo/prefix tables to their floors
-- Only updates tables that have NULL floor_id AND match unambiguous prefixes
-- AND whose restaurant has a floor with the matching canonical name.
UPDATE public.restaurant_tables t
SET floor_id = f.id
FROM public.restaurant_floors f
WHERE t.restaurant_id = f.restaurant_id
  AND t.tenant_id = f.tenant_id
  AND t.floor_id IS NULL
  AND (
    (t.table_number LIKE 'T-%'  AND f.name = 'Main Dining') OR
    (t.table_number LIKE 'PD-%' AND f.name = 'Private Dining') OR
    (t.table_number LIKE 'TR-%' AND f.name = 'Terrace')
  );
-- Tables with ambiguous/custom names (e.g. '12', 'A-4', 'Corner-1') are
-- intentionally left with floor_id = NULL and will appear under "Unassigned".
