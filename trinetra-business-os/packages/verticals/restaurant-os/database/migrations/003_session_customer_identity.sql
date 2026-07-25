-- =============================================================
-- Add customer identity columns to restaurant_table_sessions
-- Phase P1: capture customer name + phone per session.
-- =============================================================

-- 1. Add identity columns (nullable — backward-compatible)
ALTER TABLE public.restaurant_table_sessions
  ADD COLUMN IF NOT EXISTS customer_name  text,
  ADD COLUMN IF NOT EXISTS customer_phone text;

-- 2. Index for cross-device phone lookup (active sessions on a table)
CREATE INDEX IF NOT EXISTS idx_table_sessions_phone_active
  ON public.restaurant_table_sessions(customer_phone, table_id)
  WHERE status = 'active' AND customer_phone IS NOT NULL;
