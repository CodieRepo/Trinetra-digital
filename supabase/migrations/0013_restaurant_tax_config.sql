-- =========================================================================
-- Trinetra Business OS - Configurable Tax Rate Migration
-- Migration file: 0013_restaurant_tax_config.sql
-- Description: Adds configurable tax_rate and tax_label columns to restaurants table
-- =========================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (tax_rate >= 0),
  ADD COLUMN IF NOT EXISTS tax_label TEXT NOT NULL DEFAULT 'GST';
