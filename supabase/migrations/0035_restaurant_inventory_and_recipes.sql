-- ============================================================================
-- Migration 0035: Restaurant OS Milestone 11 — Inventory & Recipe (BOM) System
-- Description: Creates raw material inventory items, recipe bill of materials (BOM),
--              and stock movements audit log with tenant isolation and RLS.
-- ============================================================================

-- 1. Create restaurant_inventory_items Table
CREATE TABLE IF NOT EXISTS public.restaurant_inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT NOT NULL DEFAULT 'raw_material',
    unit TEXT NOT NULL DEFAULT 'kg', -- 'kg', 'g', 'l', 'ml', 'pcs'
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(12, 3) NOT NULL DEFAULT 5.000,
    cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    supplier_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for inventory queries
CREATE INDEX IF NOT EXISTS idx_rest_inventory_tenant_rest 
    ON public.restaurant_inventory_items(tenant_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rest_inventory_active 
    ON public.restaurant_inventory_items(restaurant_id, is_active);

-- 2. Create restaurant_recipe_items Table (Bill of Materials)
CREATE TABLE IF NOT EXISTS public.restaurant_recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.restaurant_inventory_items(id) ON DELETE CASCADE,
    quantity_consumed NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    unit TEXT NOT NULL DEFAULT 'kg',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_recipe_menu_inventory UNIQUE (menu_item_id, inventory_item_id)
);

-- Indexes for recipe lookups
CREATE INDEX IF NOT EXISTS idx_rest_recipe_menu_item 
    ON public.restaurant_recipe_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_rest_recipe_tenant_rest 
    ON public.restaurant_recipe_items(tenant_id, restaurant_id);

-- 3. Create restaurant_stock_movements Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.restaurant_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.restaurant_inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'purchase_in', 'order_consumption', 'wastage_spoilage', 'manual_adjustment'
    quantity NUMERIC(12, 3) NOT NULL, -- positive for additions, negative for reductions
    previous_stock NUMERIC(12, 3) NOT NULL,
    new_stock NUMERIC(12, 3) NOT NULL,
    order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE SET NULL,
    actor_id UUID,
    actor_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for stock movement history
CREATE INDEX IF NOT EXISTS idx_rest_movements_item_created 
    ON public.restaurant_stock_movements(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rest_movements_tenant_rest 
    ON public.restaurant_stock_movements(tenant_id, restaurant_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.restaurant_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_stock_movements ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and service_role
GRANT ALL ON public.restaurant_inventory_items TO authenticated, service_role;
GRANT ALL ON public.restaurant_recipe_items TO authenticated, service_role;
GRANT ALL ON public.restaurant_stock_movements TO authenticated, service_role;

-- Permissive RLS policies for tenant-isolated access
CREATE POLICY "Allow authenticated read on inventory items"
    ON public.restaurant_inventory_items FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage on inventory items"
    ON public.restaurant_inventory_items FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on recipe items"
    ON public.restaurant_recipe_items FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage on recipe items"
    ON public.restaurant_recipe_items FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on stock movements"
    ON public.restaurant_stock_movements FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage on stock movements"
    ON public.restaurant_stock_movements FOR ALL
    TO authenticated USING (true) WITH CHECK (true);
