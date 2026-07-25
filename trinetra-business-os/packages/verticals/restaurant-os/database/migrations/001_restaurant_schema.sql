-- =============================================================================
-- Restaurant schema
-- =============================================================================
-- Creates all tables required by the Akuafi restaurant module:
--   restaurants, restaurant_tables, restaurant_staff, menu_categories,
--   menu_items, restaurant_orders, restaurant_order_items,
--   restaurant_order_events
--
-- All server-side mutations use the service-role key (supabaseAdmin) and
-- therefore bypass RLS. RLS is still enabled on every table to block any
-- accidental direct-client writes.
--
-- restaurant_orders gets an additional anon SELECT policy so that the
-- Supabase Realtime postgres_changes subscription in StaffOrdersPanel works
-- with the public anon key.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurants (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  address      text,
  currency     text        NOT NULL DEFAULT 'INR',
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurants_client_id_key UNIQUE (client_id)
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- restaurant_tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number   text        NOT NULL,
  table_token    uuid        NOT NULL DEFAULT gen_random_uuid(),
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_tables_restaurant_number_key UNIQUE (restaurant_id, table_number),
  CONSTRAINT restaurant_tables_table_token_key UNIQUE (table_token)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Public read: needed for order placement and menu look-up (via service role).
-- Anon SELECT is intentionally omitted; all reads go through API routes that
-- use the service-role key.

-- ---------------------------------------------------------------------------
-- restaurant_staff
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_staff (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  role           text        NOT NULL CHECK (role IN ('kitchen', 'waiter')),
  access_token   uuid        NOT NULL DEFAULT gen_random_uuid(),
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_staff_access_token_key UNIQUE (access_token)
);

ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- menu_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  display_order  integer     NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid           NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id    uuid           NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name           text           NOT NULL,
  description    text,
  price          numeric(10, 2) NOT NULL CHECK (price >= 0),
  image_url      text,
  is_available   boolean        NOT NULL DEFAULT true,
  is_veg         boolean        NOT NULL DEFAULT true,
  display_order  integer        NOT NULL DEFAULT 0,
  created_at     timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- restaurant_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid           NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id       uuid           NOT NULL REFERENCES public.restaurant_tables(id),
  session_token  uuid           NOT NULL,
  status         text           NOT NULL DEFAULT 'placed'
                                CHECK (status IN ('placed','accepted','preparing','ready','served','closed','cancelled')),
  notes          text,
  total_amount   numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;

-- Anon SELECT required for Supabase Realtime postgres_changes in StaffOrdersPanel.
-- Data contains no PII (no customer name, phone, or payment info).
CREATE POLICY "anon can select restaurant_orders"
  ON public.restaurant_orders
  FOR SELECT
  TO anon
  USING (true);

-- ---------------------------------------------------------------------------
-- restaurant_order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_order_items (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid           NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id uuid           REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name         text           NOT NULL,
  price        numeric(10, 2) NOT NULL CHECK (price >= 0),
  quantity     integer        NOT NULL CHECK (quantity > 0),
  notes        text,
  created_at   timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- restaurant_order_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_order_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid        NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  from_status  text,
  to_status    text        NOT NULL,
  actor_role   text        NOT NULL,
  actor_id     text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_order_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Indexes (query-path optimisations)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id
  ON public.restaurant_tables(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_table_token
  ON public.restaurant_tables(table_token);

CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant_id
  ON public.restaurant_staff(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id
  ON public.menu_categories(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id
  ON public.menu_items(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id
  ON public.menu_items(category_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_orders_restaurant_id
  ON public.restaurant_orders(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_orders_table_id
  ON public.restaurant_orders(table_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_order_id
  ON public.restaurant_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_events_order_id
  ON public.restaurant_order_events(order_id);

-- ---------------------------------------------------------------------------
-- Supabase Storage bucket: restaurant-qrs
-- NOTE: Storage buckets cannot be created via SQL migrations in Supabase.
-- Create the bucket manually in Dashboard → Storage → New Bucket:
--   Name: restaurant-qrs   |   Public: false
-- ---------------------------------------------------------------------------
