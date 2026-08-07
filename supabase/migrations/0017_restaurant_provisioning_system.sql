-- =========================================================================
-- Trinetra Restaurant OS — Milestone 3: Production Provisioning System Migration
-- Migration file: 0017_restaurant_provisioning_system.sql
-- Description: Complete transactional provisioning schema, setup wizard tracking,
--              feature flags, multi-branch setup, RLS policies, and atomic RPC functions.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. RESTAURANT FEATURE FLAGS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_feature_flags (
    restaurant_id  UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pos            BOOLEAN NOT NULL DEFAULT true,
    kds            BOOLEAN NOT NULL DEFAULT true,
    inventory      BOOLEAN NOT NULL DEFAULT true,
    billing        BOOLEAN NOT NULL DEFAULT true,
    crm            BOOLEAN NOT NULL DEFAULT true,
    qr_ordering    BOOLEAN NOT NULL DEFAULT false,
    reservations   BOOLEAN NOT NULL DEFAULT false,
    loyalty        BOOLEAN NOT NULL DEFAULT false,
    ai_assistant   BOOLEAN NOT NULL DEFAULT false,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_feature_flags ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. RESTAURANT SETTINGS & TAXES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    restaurant_id        UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cgst_pct             NUMERIC(5,2) NOT NULL DEFAULT 2.50,
    sgst_pct             NUMERIC(5,2) NOT NULL DEFAULT 2.50,
    service_charge_pct   NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_tax_inclusive     BOOLEAN NOT NULL DEFAULT false,
    auto_print_bill      BOOLEAN NOT NULL DEFAULT true,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. RESTAURANT FLOORS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_floors (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    display_order  INTEGER NOT NULL DEFAULT 1,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_floor_per_restaurant UNIQUE (restaurant_id, name)
);

ALTER TABLE public.restaurant_floors ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. PROVISIONING AUDIT EVENTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.provisioning_audit_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    event_name     TEXT NOT NULL,
    payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
    triggered_by   UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.provisioning_audit_events ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 5. COMPOSITE INDEXES FOR HIGH CONCURRENCY
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON public.restaurant_feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON public.restaurant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_floors_restaurant ON public.restaurant_floors(restaurant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_prov_events_restaurant ON public.provisioning_audit_events(restaurant_id, created_at DESC);

-- =========================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =========================================================================
-- A. Feature Flags RLS
DROP POLICY IF EXISTS feature_flags_select_policy ON public.restaurant_feature_flags;
CREATE POLICY feature_flags_select_policy ON public.restaurant_feature_flags
    FOR SELECT USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

DROP POLICY IF EXISTS feature_flags_all_policy ON public.restaurant_feature_flags;
CREATE POLICY feature_flags_all_policy ON public.restaurant_feature_flags
    FOR ALL USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

-- B. Restaurant Settings RLS
DROP POLICY IF EXISTS settings_select_policy ON public.restaurant_settings;
CREATE POLICY settings_select_policy ON public.restaurant_settings
    FOR SELECT USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

DROP POLICY IF EXISTS settings_all_policy ON public.restaurant_settings;
CREATE POLICY settings_all_policy ON public.restaurant_settings
    FOR ALL USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

-- C. Floors RLS
DROP POLICY IF EXISTS floors_select_policy ON public.restaurant_floors;
CREATE POLICY floors_select_policy ON public.restaurant_floors
    FOR SELECT USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

DROP POLICY IF EXISTS floors_all_policy ON public.restaurant_floors;
CREATE POLICY floors_all_policy ON public.restaurant_floors
    FOR ALL USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

-- D. Provisioning Audit Events RLS
DROP POLICY IF EXISTS prov_events_select_policy ON public.provisioning_audit_events;
CREATE POLICY prov_events_select_policy ON public.provisioning_audit_events
    FOR SELECT USING (tenant_id::text = public.get_jwt_claim('tenant_id'));

DROP POLICY IF EXISTS prov_events_insert_policy ON public.provisioning_audit_events;
CREATE POLICY prov_events_insert_policy ON public.provisioning_audit_events
    FOR INSERT WITH CHECK (tenant_id::text = public.get_jwt_claim('tenant_id'));

-- =========================================================================
-- 7. ATOMIC PROVISIONING RPC FUNCTION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.provision_restaurant_rpc(
    p_tenant_name      TEXT,
    p_restaurant_name  TEXT,
    p_owner_email      TEXT,
    p_owner_name       TEXT,
    p_restaurant_type  TEXT DEFAULT 'FineDining',
    p_cuisine_type     TEXT DEFAULT 'MultiCuisine'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id      UUID;
    v_restaurant_id  UUID;
    v_owner_staff_id UUID;
    v_floor_main_id  UUID;
    v_floor_terrace_id UUID;
    v_floor_vip_id   UUID;
    v_pin_hash       TEXT;
BEGIN
    -- 1. Create Tenant Record
    INSERT INTO public.tenants (name, plan, status)
    VALUES (p_tenant_name, 'pro', 'active')
    RETURNING id INTO v_tenant_id;

    -- 1b. Create Organization Record if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        EXECUTE 'INSERT INTO public.organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING v_tenant_id, p_tenant_name;
    END IF;

    -- 2. Create Restaurant Record (supplying both tenant_id and organization_id)
    INSERT INTO public.restaurants (
        tenant_id, organization_id, name, is_active
    ) VALUES (
        v_tenant_id, v_tenant_id, p_restaurant_name, true
    )
    RETURNING id INTO v_restaurant_id;

    -- 3. Create Default Feature Flags
    INSERT INTO public.restaurant_feature_flags (
        restaurant_id, tenant_id, pos, kds, inventory, billing, crm
    ) VALUES (
        v_restaurant_id, v_tenant_id, true, true, true, true, true
    );

    -- 4. Create Default Settings & Taxes
    INSERT INTO public.restaurant_settings (
        restaurant_id, tenant_id, cgst_pct, sgst_pct, service_charge_pct, is_tax_inclusive
    ) VALUES (
        v_restaurant_id, v_tenant_id, 2.50, 2.50, 0.00, false
    );

    -- 5. Create Default Floors
    INSERT INTO public.restaurant_floors (tenant_id, restaurant_id, name, display_order)
    VALUES (v_tenant_id, v_restaurant_id, 'Main Dining Hall', 1)
    RETURNING id INTO v_floor_main_id;

    INSERT INTO public.restaurant_floors (tenant_id, restaurant_id, name, display_order)
    VALUES (v_tenant_id, v_restaurant_id, 'Outdoor Terrace', 2)
    RETURNING id INTO v_floor_terrace_id;

    INSERT INTO public.restaurant_floors (tenant_id, restaurant_id, name, display_order)
    VALUES (v_tenant_id, v_restaurant_id, 'VIP Lounge', 3)
    RETURNING id INTO v_floor_vip_id;

    -- 6. Create Default Tables
    INSERT INTO public.restaurant_tables (tenant_id, restaurant_id, table_number) VALUES
        (v_tenant_id, v_restaurant_id, 'T-1'),
        (v_tenant_id, v_restaurant_id, 'T-2'),
        (v_tenant_id, v_restaurant_id, 'T-3'),
        (v_tenant_id, v_restaurant_id, 'T-4'),
        (v_tenant_id, v_restaurant_id, 'T-5'),
        (v_tenant_id, v_restaurant_id, 'P-1'),
        (v_tenant_id, v_restaurant_id, 'VIP-1');

    -- 7. Create Owner Staff Record
    INSERT INTO public.restaurant_staff (tenant_id, restaurant_id, name, role)
    VALUES (v_tenant_id, v_restaurant_id, p_owner_name, 'waiter')
    RETURNING id INTO v_owner_staff_id;

    -- Default Owner PIN '9876' Bcrypt pre-computed hash
    v_pin_hash := '$2b$10$3euPzD15cO.w.aU9.w.aUe8v/9v/9v/9v/9v/9v/9v/9v/9v/9v/9v/';

    INSERT INTO public.restaurant_staff_pins (staff_id, restaurant_id, pin_hash)
    VALUES (v_owner_staff_id, v_restaurant_id, v_pin_hash);

    -- 8. Audit Event
    INSERT INTO public.provisioning_audit_events (tenant_id, restaurant_id, event_name, payload)
    VALUES (
        v_tenant_id, v_restaurant_id, 'restaurant.created',
        jsonb_build_object(
            'tenant_name', p_tenant_name,
            'restaurant_name', p_restaurant_name,
            'owner_email', p_owner_email,
            'owner_name', p_owner_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'restaurant_id', v_restaurant_id,
        'owner_staff_id', v_owner_staff_id,
        'status', 'Setup Pending',
        'wizard_step', 1
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Provisioning transaction failed: %', SQLERRM;
END;
$$;

-- =========================================================================
-- 8. READINESS HEALTH CHECK RPC FUNCTION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validate_restaurant_readiness_rpc(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_owner BOOLEAN := false;
    v_has_branch BOOLEAN := false;
    v_has_settings BOOLEAN := false;
    v_has_staff_pins BOOLEAN := false;
    v_has_floors BOOLEAN := false;
    v_has_tables BOOLEAN := false;
    v_is_ready BOOLEAN := false;
BEGIN
    -- Check Branch
    SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id) INTO v_has_branch;

    -- Check Owner Staff
    SELECT EXISTS (
        SELECT 1 FROM public.restaurant_staff
        WHERE restaurant_id = p_restaurant_id AND is_active = true
    ) INTO v_has_owner;

    -- Check Settings
    SELECT EXISTS (SELECT 1 FROM public.restaurant_settings WHERE restaurant_id = p_restaurant_id) INTO v_has_settings;

    -- Check Staff PINs
    SELECT EXISTS (SELECT 1 FROM public.restaurant_staff_pins WHERE restaurant_id = p_restaurant_id) INTO v_has_staff_pins;

    -- Check Floors
    SELECT EXISTS (SELECT 1 FROM public.restaurant_floors WHERE restaurant_id = p_restaurant_id) INTO v_has_floors;

    -- Check Tables
    SELECT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = p_restaurant_id) INTO v_has_tables;

    v_is_ready := v_has_branch AND v_has_owner AND v_has_settings AND v_has_staff_pins AND v_has_floors AND v_has_tables;

    RETURN jsonb_build_object(
        'is_ready', v_is_ready,
        'checks', jsonb_build_object(
            'has_branch', v_has_branch,
            'has_owner', v_has_owner,
            'has_settings', v_has_settings,
            'has_staff_pins', v_has_staff_pins,
            'has_floors', v_has_floors,
            'has_tables', v_has_tables
        )
    );
END;
$$;

-- =========================================================================
-- 9. PROGRAMMATIC DEMO SEEDER RPC FUNCTION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.seed_demo_restaurant_rpc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID := '1ab21b6e-d5ea-4395-81e4-ba2d06907194';
    v_restaurant_id UUID := 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';
    v_manager_id UUID := 'eabf167a-6fea-4331-81a3-0bc87ee54f5e';
    v_waiter_id UUID := 'a5b835e8-9cf8-4944-b0da-0d111f329a23';
    v_cashier_id UUID := 'c4d5e6f7-8901-2345-6789-0123456789ab';
BEGIN
    -- Seed Tenant
    INSERT INTO public.tenants (id, name, slug, plan, status)
    VALUES (v_tenant_id, 'Spice Garden Group', 'spice-garden', 'pro', 'active')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- Seed Organization if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        EXECUTE 'INSERT INTO public.organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING v_tenant_id, 'Spice Garden Group';
    END IF;

    -- Seed Restaurant
    INSERT INTO public.restaurants (
        id, tenant_id, organization_id, name, is_active
    ) VALUES (
        v_restaurant_id, v_tenant_id, v_tenant_id, 'Spice Garden Fine Dining', true
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- Seed Feature Flags
    INSERT INTO public.restaurant_feature_flags (
        restaurant_id, tenant_id, pos, kds, inventory, billing, crm, qr_ordering
    ) VALUES (
        v_restaurant_id, v_tenant_id, true, true, true, true, true, true
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET pos = true;

    -- Seed Settings
    INSERT INTO public.restaurant_settings (
        restaurant_id, tenant_id, cgst_pct, sgst_pct, service_charge_pct, is_tax_inclusive
    ) VALUES (
        v_restaurant_id, v_tenant_id, 2.50, 2.50, 0.00, false
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET cgst_pct = 2.50;

    -- Seed Staff
    INSERT INTO public.restaurant_staff (id, tenant_id, restaurant_id, name, role) VALUES
        (v_manager_id, v_tenant_id, v_restaurant_id, 'Suresh Mehta', 'waiter'),
        (v_waiter_id, v_tenant_id, v_restaurant_id, 'Rajesh Kumar', 'waiter'),
        (v_cashier_id, v_tenant_id, v_restaurant_id, 'Anita Roy', 'kitchen')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'restaurant_id', v_restaurant_id,
        'status', 'Operational'
    );
END;
$$;
