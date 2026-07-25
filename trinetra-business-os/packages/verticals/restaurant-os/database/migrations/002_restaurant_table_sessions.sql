-- =============================================================
-- Restaurant Table Sessions
-- Represents one customer visit/sitting at a table.
-- Multiple orders can belong to a single table session.
-- =============================================================

-- 1. Create the table_sessions table
CREATE TABLE IF NOT EXISTS public.restaurant_table_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id        uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  session_token   uuid NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_table_sessions ENABLE ROW LEVEL SECURITY;

-- No anon policy — service-role only. PII-safe by default.

-- 2. Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_table_sessions_active
  ON public.restaurant_table_sessions(table_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_table_sessions_token
  ON public.restaurant_table_sessions(session_token, table_id);

CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant
  ON public.restaurant_table_sessions(restaurant_id, status);

-- 3. Add table_session_id FK on restaurant_orders (nullable for backward compat)
ALTER TABLE public.restaurant_orders
  ADD COLUMN IF NOT EXISTS table_session_id uuid
    REFERENCES public.restaurant_table_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_table_session
  ON public.restaurant_orders(table_session_id);
