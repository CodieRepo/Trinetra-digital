-- =========================================================================
-- Trinetra Restaurant OS — Phase 1 Staff Push Devices Schema
-- Migration file: 0022_staff_push_devices.sql
-- Description: Normalized staff push device registry with SHA-256 token hashing,
--              observability timestamps, failure telemetry, and tenant-scoped RLS.
-- =========================================================================

-- 1. Create normalized staff push device table
CREATE TABLE IF NOT EXISTS public.staff_push_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.restaurant_staff(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    device_token_hash TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    device_name TEXT,
    app_version TEXT DEFAULT '1.0.0',
    environment TEXT NOT NULL DEFAULT 'production',
    is_active BOOLEAN NOT NULL DEFAULT true,
    failure_count INT NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_token_refresh_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_push_success_at TIMESTAMPTZ,
    last_push_failure_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_staff_push_devices_lookup 
  ON public.staff_push_devices (tenant_id, restaurant_id, staff_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_push_devices_hash 
  ON public.staff_push_devices (device_token_hash);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.staff_push_devices ENABLE ROW LEVEL SECURITY;

-- 4. Revoke anonymous access
REVOKE ALL ON public.staff_push_devices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_push_devices TO authenticated, service_role;

-- 5. Tenant-Scoped RLS Policy
DROP POLICY IF EXISTS staff_push_devices_tenant_policy ON public.staff_push_devices;
CREATE POLICY staff_push_devices_tenant_policy ON public.staff_push_devices
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
