-- =========================================================================
-- Trinetra Business OS & CRM - Migration: 0033_fix_multitenant_phone_isolation.sql
-- Description: Fix cross-tenant phone unique constraint collision and update
--              sync_restaurant_session_to_lead trigger to isolate leads per tenant.
-- =========================================================================

BEGIN;

-- 1. Drop global single-column phone uniqueness if exists
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_phone_key CASCADE;
DROP INDEX IF EXISTS public.leads_phone_key CASCADE;

-- 2. Safely ensure composite tenant-isolated phone constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'unique_phone_per_tenant' AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT unique_phone_per_tenant UNIQUE (tenant_id, phone);
  END IF;
END $$;

-- 3. Create v2 trigger function with strict tenant-scoped conflict resolution
-- (Using v2 name avoids 42501 ownership collision on existing legacy functions)
CREATE OR REPLACE FUNCTION public.sync_restaurant_session_to_lead_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone <> '' THEN
    INSERT INTO public.leads (
      tenant_id,
      phone,
      name,
      service_interest,
      source,
      status
    )
    VALUES (
      NEW.tenant_id,
      NEW.customer_phone,
      COALESCE(NEW.customer_name, 'Dine-in Customer'),
      'Restaurant Dine-in',
      'Restaurant Session',
      'new'
    )
    ON CONFLICT (tenant_id, phone) DO UPDATE
    SET 
      name = COALESCE(EXCLUDED.name, public.leads.name),
      service_interest = 'Restaurant Dine-in',
      source = 'Restaurant Session',
      status = 'new'
    RETURNING id INTO v_lead_id;

    IF v_lead_id IS NOT NULL THEN
      NEW.lead_id := v_lead_id;
      IF (TG_OP = 'UPDATE' OR TG_OP = 'INSERT') AND (TG_WHEN = 'AFTER') THEN
        UPDATE public.restaurant_table_sessions
        SET lead_id = v_lead_id
        WHERE id = NEW.id AND (lead_id IS NULL OR lead_id <> v_lead_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach trigger to the new v2 function
DROP TRIGGER IF EXISTS trg_sync_restaurant_session_lead ON public.restaurant_table_sessions;

CREATE TRIGGER trg_sync_restaurant_session_lead
  AFTER INSERT OR UPDATE OF customer_name, customer_phone
  ON public.restaurant_table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_restaurant_session_to_lead_v2();

COMMIT;
