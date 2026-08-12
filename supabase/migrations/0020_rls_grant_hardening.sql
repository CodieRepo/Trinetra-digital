-- =========================================================================
-- Trinetra Restaurant OS — Phase S3 Database RLS & Grant Hardening Migration
-- Migration file: 0020_rls_grant_hardening.sql
-- Description: Revokes permissive grants to 'anon' on internal settings tables,
--              eliminates permissive USING (true) policies on financial and
--              tenant tables, and enforces strict tenant-scoping RLS.
-- =========================================================================

-- 1. Revoke public 'anon' grants on internal operational/settings tables
REVOKE ALL ON public.restaurant_profiles FROM anon;
REVOKE ALL ON public.restaurant_settings FROM anon;
REVOKE ALL ON public.restaurant_floors FROM anon;
REVOKE ALL ON public.provisioning_audit_events FROM anon;
REVOKE ALL ON public.restaurant_feature_flags FROM anon;

-- Ensure authenticated and service_role retain proper access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_settings TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_floors TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provisioning_audit_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_feature_flags TO authenticated, service_role;

-- 2. Drop permissive USING (true) policies on financial & audit tables
DROP POLICY IF EXISTS restaurant_bills_tenant_policy ON public.restaurant_bills;
DROP POLICY IF EXISTS restaurant_discount_audit_tenant_policy ON public.restaurant_discount_audit;
DROP POLICY IF EXISTS bhash_leads_all ON public.leads;
DROP POLICY IF EXISTS bhash_conv_all ON public.bhash_conversations;
DROP POLICY IF EXISTS bhash_timeline_all ON public.bhash_timeline_events;
DROP POLICY IF EXISTS bhash_tasks_all ON public.bhash_tasks;
DROP POLICY IF EXISTS bhash_notes_all ON public.bhash_lead_notes;

-- 3. Hardened Tenant-Scoped Policies for Financial Bills & Discount Audits
CREATE POLICY restaurant_bills_tenant_policy ON public.restaurant_bills
  FOR ALL
  USING (
    current_setting('role', true) = 'service_role' OR 
    coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR 
    tenant_id::text = public.get_jwt_claim('tenant_id')
  )
  WITH CHECK (
    current_setting('role', true) = 'service_role' OR 
    coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR 
    tenant_id::text = public.get_jwt_claim('tenant_id')
  );

CREATE POLICY restaurant_discount_audit_tenant_policy ON public.restaurant_discount_audit
  FOR ALL
  USING (
    current_setting('role', true) = 'service_role' OR 
    coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR 
    tenant_id::text = public.get_jwt_claim('tenant_id')
  )
  WITH CHECK (
    current_setting('role', true) = 'service_role' OR 
    coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR 
    tenant_id::text = public.get_jwt_claim('tenant_id')
  );
