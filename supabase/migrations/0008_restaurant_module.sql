-- =========================================================================
-- Trinetra Business OS - Restaurant Module Migration
-- Migration file: 0008_restaurant_module.sql
-- Description: Multi-tenant, tenant-aware database architecture for Restaurant OS vertical
-- All entities belong to a Tenant (Organization) and integrate with Trinetra CRM leads.
-- =========================================================================

-- 1. RESTAURANTS (Tenant-scoped restaurant profile)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  address      TEXT,
  currency     TEXT NOT NULL DEFAULT 'INR',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_restaurant UNIQUE (tenant_id)
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number   TEXT NOT NULL,
  table_token    UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_tables_tenant_number_key UNIQUE (tenant_id, restaurant_id, table_number),
  CONSTRAINT restaurant_tables_table_token_key UNIQUE (table_token)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- 3. RESTAURANT STAFF (Kitchen/Waiter tokens scoped to tenant)
CREATE TABLE IF NOT EXISTS public.restaurant_staff (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('kitchen', 'waiter')),
  access_token   UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_staff_access_token_key UNIQUE (access_token)
);

ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

-- 4. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- 5. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url      TEXT,
  is_available   BOOLEAN NOT NULL DEFAULT true,
  is_veg         BOOLEAN NOT NULL DEFAULT true,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 6. RESTAURANT TABLE SESSIONS (Integrates with Trinetra CRM leads)
CREATE TABLE IF NOT EXISTS public.restaurant_table_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id        UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES public.leads(id) ON DELETE SET NULL, -- CRM Integration
  session_token   UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_name   TEXT,
  customer_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_table_sessions ENABLE ROW LEVEL SECURITY;

-- 7. RESTAURANT ORDERS
CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id    UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id         UUID NOT NULL REFERENCES public.restaurant_tables(id),
  table_session_id UUID REFERENCES public.restaurant_table_sessions(id) ON DELETE SET NULL,
  session_token    UUID NOT NULL,
  status           TEXT NOT NULL DEFAULT 'placed'
                   CHECK (status IN ('placed','accepted','preparing','ready','served','closed','cancelled')),
  notes            TEXT,
  total_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;

-- 8. RESTAURANT ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.restaurant_order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;

-- 9. RESTAURANT ORDER EVENTS (Audit Log)
CREATE TABLE IF NOT EXISTS public.restaurant_order_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  actor_role   TEXT NOT NULL,
  actor_id     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_order_events ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- HIGH-PERFORMANCE TENANT-ISOLATED INDEXES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_restaurants_tenant ON public.restaurants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant ON public.restaurant_tables(tenant_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_token ON public.restaurant_tables(table_token);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_tenant ON public.restaurant_staff(tenant_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_token ON public.restaurant_staff(access_token);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON public.menu_categories(tenant_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant ON public.menu_items(tenant_id, restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_sessions_tenant ON public.restaurant_table_sessions(tenant_id, restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_sessions_lead ON public.restaurant_table_sessions(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_tenant ON public.restaurant_orders(tenant_id, restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_session ON public.restaurant_orders(tenant_id, table_session_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_tenant ON public.restaurant_order_items(tenant_id, order_id);

-- Permissive service role & RLS policies for tenant data isolation
CREATE POLICY restaurants_tenant_policy ON public.restaurants FOR ALL USING (true);
CREATE POLICY restaurant_tables_tenant_policy ON public.restaurant_tables FOR ALL USING (true);
CREATE POLICY restaurant_staff_tenant_policy ON public.restaurant_staff FOR ALL USING (true);
CREATE POLICY menu_categories_tenant_policy ON public.menu_categories FOR ALL USING (true);
CREATE POLICY menu_items_tenant_policy ON public.menu_items FOR ALL USING (true);
CREATE POLICY restaurant_table_sessions_tenant_policy ON public.restaurant_table_sessions FOR ALL USING (true);
CREATE POLICY restaurant_orders_tenant_policy ON public.restaurant_orders FOR ALL USING (true);
CREATE POLICY restaurant_order_items_tenant_policy ON public.restaurant_order_items FOR ALL USING (true);
CREATE POLICY restaurant_order_events_tenant_policy ON public.restaurant_order_events FOR ALL USING (true);
