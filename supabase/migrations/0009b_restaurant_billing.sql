-- =========================================================================
-- Trinetra Business OS - Restaurant Billing and Discount Auditing Migration
-- Migration file: 0009_restaurant_billing.sql
-- Description: Advanced additive schema updates for SaaS bill settlements, discounts, and audit logs.
-- =========================================================================

-- 1. RESTAURANT BILLS (Stores session-level billing totals, taxes, and discounts)
CREATE TABLE IF NOT EXISTS public.restaurant_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES public.restaurant_table_sessions(id) ON DELETE CASCADE,
  subtotal        NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount_type   TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('percentage', 'flat', 'none')),
  discount_value  NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_value >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  discount_reason TEXT,
  tax_amount      NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  service_charge  NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
  round_off       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  grand_total     NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_session_bill UNIQUE (session_id)
);

ALTER TABLE public.restaurant_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS restaurant_bills_tenant_policy ON public.restaurant_bills;
CREATE POLICY restaurant_bills_tenant_policy ON public.restaurant_bills FOR ALL USING (true);

-- 2. RESTAURANT DISCOUNT AUDIT (Tracks history of all discounts applied for fraud prevention)
CREATE TABLE IF NOT EXISTS public.restaurant_discount_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES public.restaurant_table_sessions(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role      TEXT NOT NULL CHECK (actor_role IN ('owner', 'admin', 'manager', 'waiter', 'super_admin', 'client_admin')),
  before_amount   NUMERIC(10, 2) NOT NULL CHECK (before_amount >= 0),
  after_amount    NUMERIC(10, 2) NOT NULL CHECK (after_amount >= 0),
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value  NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL CHECK (discount_amount >= 0),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_discount_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS restaurant_discount_audit_tenant_policy ON public.restaurant_discount_audit;
CREATE POLICY restaurant_discount_audit_tenant_policy ON public.restaurant_discount_audit FOR ALL USING (true);

-- Indexes for performance and isolation scoping
CREATE INDEX IF NOT EXISTS idx_restaurant_bills_tenant ON public.restaurant_bills(tenant_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_bills_session ON public.restaurant_bills(session_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_discount_audit_tenant ON public.restaurant_discount_audit(tenant_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_discount_audit_session ON public.restaurant_discount_audit(session_id);
