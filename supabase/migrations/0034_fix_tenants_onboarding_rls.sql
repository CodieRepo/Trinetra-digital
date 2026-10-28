-- =========================================================================
-- Trinetra CRM & Restaurant OS — Tenants Onboarding RLS Policy Fix
-- Migration: 0034_fix_tenants_onboarding_rls.sql
-- =========================================================================

-- 1. Grant necessary privileges to service_role and authenticated users
GRANT ALL ON public.tenants TO service_role, postgres;
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;

-- 2. Drop any conflicting existing insert policies
DROP POLICY IF EXISTS "tenants_insert_service" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_all_service" ON public.tenants;

-- 3. Policy for service_role to insert, select, update, and manage tenants
CREATE POLICY "tenants_all_service" ON public.tenants
  FOR ALL TO service_role, postgres
  USING (true)
  WITH CHECK (true);

-- 4. Policy for authenticated users (admin onboarding from CRM panel)
CREATE POLICY "tenants_insert_admin" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Fix crm_is_service_role_caller to recognize PostgREST 10+ JWT claims structure
CREATE OR REPLACE FUNCTION public.crm_is_service_role_caller()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session_user text := session_user;
    v_active_role text;
    v_jwt_role text;
    v_claims_json jsonb;
BEGIN
    -- 1. Direct superuser / DBA maintenance sessions
    IF v_session_user IN ('postgres', 'supabase_admin', 'trinetra_app') 
       AND NULLIF(current_setting('request.jwt.claim.role', true), '') IS NULL THEN
        RETURN true;
    END IF;

    -- 2. Direct database connection authenticated directly as service_role
    IF v_session_user = 'service_role' THEN
        RETURN true;
    END IF;

    -- 3. PostgREST authentic service_role requests
    BEGIN
        v_active_role := current_setting('role', true);
        v_jwt_role := NULLIF(current_setting('request.jwt.claim.role', true), '');
        
        -- Also check modern PostgREST request.jwt.claims JSON format
        IF v_jwt_role IS NULL THEN
            BEGIN
                v_claims_json := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
                v_jwt_role := v_claims_json->>'role';
            EXCEPTION WHEN OTHERS THEN
                v_jwt_role := NULL;
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_active_role := NULL;
        v_jwt_role := NULL;
    END;

    IF (v_session_user = 'authenticator' OR v_session_user = 'trinetra_app')
       AND (v_active_role = 'service_role' OR v_jwt_role = 'service_role') THEN
        RETURN true;
    END IF;

    -- 4. Direct service_role claim
    IF v_jwt_role = 'service_role' THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;
