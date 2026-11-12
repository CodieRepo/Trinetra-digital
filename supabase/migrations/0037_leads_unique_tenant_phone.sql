-- =========================================================================
-- Migration: 0037_leads_unique_tenant_phone.sql
-- Purpose: Add UNIQUE (tenant_id, phone) constraint on public.leads.
--          Previous migrations 0033 and 0036 checked pg_class for
--          'unique_phone_per_tenant', which already existed on public.contacts
--          (from 0001_initial_schema.sql), causing public.leads to remain
--          without a (tenant_id, phone) unique constraint (42P10 error).
-- =========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_tenant_id_phone_key'
  ) THEN
    DELETE FROM public.leads a
    USING public.leads b
    WHERE a.ctid < b.ctid
      AND a.tenant_id IS NOT DISTINCT FROM b.tenant_id
      AND a.phone IS NOT DISTINCT FROM b.phone
      AND a.phone IS NOT NULL;

    ALTER TABLE public.leads
      ADD CONSTRAINT leads_tenant_id_phone_key UNIQUE (tenant_id, phone);
  END IF;
END $$;
