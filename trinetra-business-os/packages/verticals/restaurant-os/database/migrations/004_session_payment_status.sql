-- =============================================================
-- Add payment status to restaurant_table_sessions
-- Phase P2: mark-paid / undo-paid flow for table settlement.
-- =============================================================

-- 1. Payment columns (nullable/default — backward-compatible)
ALTER TABLE public.restaurant_table_sessions
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_at        timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by        uuid;

-- 2. Index for quick filtering of unpaid active sessions
CREATE INDEX IF NOT EXISTS idx_table_sessions_payment
  ON public.restaurant_table_sessions(restaurant_id, payment_status)
  WHERE status = 'active';
