-- Migration: 0026_restaurant_os_hardening.sql
-- Production Hardening: Add logo_url column, bill_requested_at column, and performance indexes for active operations

-- 1. Add logo_url column to restaurants table if missing
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Add bill_requested_at column to restaurant_table_sessions table if missing
ALTER TABLE public.restaurant_table_sessions
ADD COLUMN IF NOT EXISTS bill_requested_at TIMESTAMPTZ;

-- 3. Add performance indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_active 
ON public.restaurant_orders(tenant_id, restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_restaurant_orders_session 
ON public.restaurant_orders(table_session_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_sessions_active 
ON public.restaurant_table_sessions(tenant_id, restaurant_id, status, payment_status);

CREATE INDEX IF NOT EXISTS idx_restaurant_bills_session 
ON public.restaurant_bills(session_id);
