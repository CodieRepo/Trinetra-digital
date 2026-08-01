-- =========================================================================
-- Trinetra Business OS - Restaurant CRM Sync Migration
-- Migration file: 0010_restaurant_crm_sync.sql
-- Description: Sync restaurant table sessions with CRM leads table
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_restaurant_session_to_lead()
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
    ON CONFLICT (phone) DO UPDATE
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

-- Add trigger trg_sync_restaurant_session_lead to public.restaurant_table_sessions
DROP TRIGGER IF EXISTS trg_sync_restaurant_session_lead ON public.restaurant_table_sessions;

CREATE TRIGGER trg_sync_restaurant_session_lead
  AFTER INSERT OR UPDATE OF customer_name, customer_phone
  ON public.restaurant_table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_restaurant_session_to_lead();
