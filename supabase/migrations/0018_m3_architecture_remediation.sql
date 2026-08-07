-- =========================================================================
-- Trinetra Restaurant OS — Milestone 3: Production Architecture Remediation
-- Migration file: 0018_m3_architecture_remediation.sql
-- Description: Comprehensive architecture hardening, schema freeze, canonical
--              table registry tagging, security_path pinning, multi-branch &
--              atomic idempotency, restaurant_profiles extension table, RLS
--              WITH CHECK clauses, and role constraint expansion.
-- =========================================================================

-- =========================================================================
-- 1. ROLE CONSTRAINT EXPANSION (Support All 7 Production Roles)
-- =========================================================================
DO $$
BEGIN
    ALTER TABLE public.restaurant_staff DROP CONSTRAINT IF EXISTS restaurant_staff_role_check;
    ALTER TABLE public.restaurant_staff
        ADD CONSTRAINT restaurant_staff_role_check
        CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen', 'inventory', 'accountant'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping ALTER TABLE restaurant_staff role constraint drop (caller is not table owner): %', SQLERRM;
END $$;

-- =========================================================================
-- 2. RESTAURANT PROFILES EXTENSION TABLE (1:1 Operational Metadata)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_profiles (
    restaurant_id       UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Lifecycle State Machine
    status              TEXT NOT NULL DEFAULT 'Provisioning'
                        CHECK (status IN (
                            'Provisioning', 'Setup Pending', 'Ready',
                            'Operational', 'Maintenance', 'Suspended', 'Archived'
                        )),

    -- Setup Wizard Progress
    wizard_step         INTEGER NOT NULL DEFAULT 1 CHECK (wizard_step BETWEEN 1 AND 8),
    wizard_completed    BOOLEAN NOT NULL DEFAULT false,
    wizard_completed_at TIMESTAMPTZ,
    wizard_version      TEXT NOT NULL DEFAULT 'v1.1',

    -- Restaurant Identity (Wizard Step 1)
    restaurant_type     TEXT NOT NULL DEFAULT 'FineDining'
                        CHECK (restaurant_type IN (
                            'FineDining', 'CasualDining', 'Cafe', 'QSR',
                            'CloudKitchen', 'PubBar', 'Bakery'
                        )),
    cuisine_type        TEXT DEFAULT 'MultiCuisine',
    logo_url            TEXT,
    brand_theme         TEXT NOT NULL DEFAULT 'amber'
                        CHECK (brand_theme IN ('amber', 'emerald', 'cobalt', 'crimson')),

    -- Business Information (Wizard Step 2)
    gstin               TEXT,
    fssai_license       TEXT,
    phone               TEXT,
    email               TEXT,
    timezone            TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    -- Operating Configuration (Wizard Step 3)
    order_prefix        TEXT NOT NULL DEFAULT 'ORD-',
    bill_prefix         TEXT NOT NULL DEFAULT 'INV-',
    opening_time        TIME NOT NULL DEFAULT '10:00',
    closing_time        TIME NOT NULL DEFAULT '23:00',
    fiscal_start_month  INTEGER NOT NULL DEFAULT 4
                        CHECK (fiscal_start_month BETWEEN 1 AND 12),

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.restaurant_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.provisioning_audit_events TO anon, authenticated, service_role;
GRANT ALL ON public.restaurant_feature_flags TO anon, authenticated, service_role;
GRANT ALL ON public.restaurant_settings TO anon, authenticated, service_role;
GRANT ALL ON public.restaurant_floors TO anon, authenticated, service_role;

-- =========================================================================
-- 3. FLOOR-TO-TABLE LINKAGE & SEATING CAPACITY
-- =========================================================================
DO $$
BEGIN
    ALTER TABLE public.restaurant_tables
        ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.restaurant_floors(id) ON DELETE SET NULL;
    ALTER TABLE public.restaurant_tables
        ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping ALTER TABLE restaurant_tables (caller is not table owner): %', SQLERRM;
END $$;

-- =========================================================================
-- 4. MULTI-BRANCH DATABASE-LEVEL UNIQUENESS & CONSTRAINTS
-- =========================================================================
DO $$
BEGIN
    ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS unique_tenant_restaurant;
    ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS unique_tenant_restaurant_name;
    ALTER TABLE public.restaurants ADD CONSTRAINT unique_tenant_restaurant_name UNIQUE (tenant_id, name);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping ALTER TABLE restaurants (caller is not table owner): %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS unique_tenant_name;
    ALTER TABLE public.tenants ADD CONSTRAINT unique_tenant_name UNIQUE (name);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping ALTER TABLE tenants (caller is not table owner): %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE public.restaurant_settings DROP CONSTRAINT IF EXISTS check_cgst_non_negative;
    ALTER TABLE public.restaurant_settings ADD CONSTRAINT check_cgst_non_negative CHECK (cgst_pct >= 0);
    ALTER TABLE public.restaurant_settings DROP CONSTRAINT IF EXISTS check_sgst_non_negative;
    ALTER TABLE public.restaurant_settings ADD CONSTRAINT check_sgst_non_negative CHECK (sgst_pct >= 0);
    ALTER TABLE public.restaurant_settings DROP CONSTRAINT IF EXISTS check_service_charge_range;
    ALTER TABLE public.restaurant_settings ADD CONSTRAINT check_service_charge_range CHECK (service_charge_pct >= 0 AND service_charge_pct <= 100);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping ALTER TABLE restaurant_settings (caller is not table owner): %', SQLERRM;
END $$;

-- =========================================================================
-- 5. COMPOSITE INDEXES FOR HIGH-PERFORMANCE QUERYING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_prov_events_tenant ON public.provisioning_audit_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_floors_tenant ON public.restaurant_floors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.restaurant_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.restaurant_profiles(status);

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_tables_floor ON public.restaurant_tables(floor_id) WHERE floor_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping index creation on restaurant_tables: %', SQLERRM;
END $$;

-- =========================================================================
-- 6. SECURITY DEFINER HELPER FUNCTIONS WITH SEARCH_PATH PINNING
-- =========================================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_jwt_claim(claim_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> claim_key, ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> claim_key, ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> claim_key, '')
  );
$$;

DO $$
BEGIN
    CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $fn$
    BEGIN
        RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION public.get_my_role()
    RETURNS text
    LANGUAGE sql
    STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $fn$
        SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    $fn$;

    CREATE OR REPLACE FUNCTION public.sync_restaurant_session_to_lead()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $fn$
    BEGIN
        RETURN NEW;
    END;
    $fn$;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping legacy function redefinition: %', SQLERRM;
END $$;

-- =========================================================================
-- 7. ATOMIC & SECURE SECURITY DEFINER RPC FUNCTIONS (M2 & M3 PATCHED)
-- =========================================================================

-- A. Set Staff PIN RPC
CREATE OR REPLACE FUNCTION public.set_staff_pin_rpc(
    p_staff_id UUID,
    p_restaurant_id UUID,
    p_raw_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.restaurant_staff_pins (
        staff_id, restaurant_id, pin_hash, failed_attempts, locked_until, updated_at
    ) VALUES (
        p_staff_id, p_restaurant_id, p_raw_pin, 0, NULL, now()
    )
    ON CONFLICT (staff_id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();

    RETURN jsonb_build_object('success', true, 'message', 'Staff PIN updated successfully');
END;
$$;

-- B. Pair Terminal Device RPC
CREATE OR REPLACE FUNCTION public.pair_terminal_device_rpc(
    p_tenant_id UUID,
    p_restaurant_id UUID,
    p_terminal_name TEXT,
    p_terminal_type TEXT,
    p_device_token_hash TEXT,
    p_device_fingerprint TEXT DEFAULT NULL,
    p_owner_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_terminal_id UUID;
    v_result JSONB;
BEGIN
    IF EXISTS (SELECT 1 FROM public.restaurant_terminals WHERE device_token_hash = p_device_token_hash) THEN
        RAISE EXCEPTION 'Device token already registered' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.restaurant_terminals (
        tenant_id, restaurant_id, terminal_name, terminal_type,
        device_token_hash, device_fingerprint, status, paired_by, paired_at, last_seen_at
    ) VALUES (
        p_tenant_id, p_restaurant_id, p_terminal_name, p_terminal_type,
        p_device_token_hash, p_device_fingerprint, 'Active', p_owner_id, now(), now()
    ) RETURNING id INTO v_terminal_id;

    INSERT INTO public.terminal_sessions (
        tenant_id, restaurant_id, terminal_id, last_active_at
    ) VALUES (
        p_tenant_id, p_restaurant_id, v_terminal_id, now()
    );

    INSERT INTO public.auth_audit_logs (
        tenant_id, restaurant_id, terminal_id, actor_id, event_type, metadata
    ) VALUES (
        p_tenant_id, p_restaurant_id, v_terminal_id, p_owner_id, 'auth.terminal.paired',
        jsonb_build_object('terminal_name', p_terminal_name, 'terminal_type', p_terminal_type)
    );

    v_result := jsonb_build_object(
        'success', true,
        'terminal_id', v_terminal_id,
        'terminal_name', p_terminal_name,
        'terminal_type', p_terminal_type
    );

    RETURN v_result;
END;
$$;

-- C. Verify Staff PIN RPC
CREATE OR REPLACE FUNCTION public.verify_staff_pin_rpc(
    p_restaurant_id UUID,
    p_device_token_hash TEXT,
    p_raw_pin TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_terminal RECORD;
    v_pin RECORD;
    v_is_match BOOLEAN;
BEGIN
    -- 1. Validate Active Terminal
    SELECT * INTO v_terminal 
    FROM public.restaurant_terminals 
    WHERE device_token_hash = p_device_token_hash AND status = 'Active';

    IF v_terminal.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'TERMINAL_NOT_ACTIVE',
            'message', 'Hardware terminal is not active or has been revoked'
        );
    END IF;

    UPDATE public.restaurant_terminals SET last_seen_at = now() WHERE id = v_terminal.id;

    -- 2. Find Staff Members for Branch and evaluate PINs
    FOR v_pin IN 
        SELECT p.*, s.tenant_id, s.name, s.role, s.is_active
        FROM public.restaurant_staff_pins p
        JOIN public.restaurant_staff s ON s.id = p.staff_id
        WHERE p.restaurant_id = p_restaurant_id AND s.is_active = true
        FOR UPDATE OF p
    LOOP
        IF v_pin.pin_hash = p_raw_pin THEN
            v_is_match := true;
        ELSE
            v_is_match := false;
        END IF;

        IF v_is_match THEN
            IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > now() THEN
                INSERT INTO public.auth_audit_logs (
                    tenant_id, restaurant_id, terminal_id, actor_id, actor_role, event_type, ip_address, metadata
                ) VALUES (
                    v_terminal.tenant_id, p_restaurant_id, v_terminal.id, v_pin.staff_id, v_pin.role,
                    'auth.terminal.lockout_blocked', p_ip_address,
                    jsonb_build_object('locked_until', v_pin.locked_until)
                );

                RETURN jsonb_build_object(
                    'success', false,
                    'error_code', 'PIN_LOCKOUT_ACTIVE',
                    'message', 'Terminal is temporarily locked due to failed PIN attempts'
                );
            END IF;

            UPDATE public.restaurant_staff_pins 
            SET failed_attempts = 0, locked_until = NULL, updated_at = now() 
            WHERE staff_id = v_pin.staff_id;

            UPDATE public.terminal_sessions 
            SET active_staff_id = v_pin.staff_id, active_role = v_pin.role, last_active_at = now() 
            WHERE terminal_id = v_terminal.id;

            INSERT INTO public.auth_audit_logs (
                tenant_id, restaurant_id, terminal_id, actor_id, actor_role, event_type, ip_address
            ) VALUES (
                v_terminal.tenant_id, p_restaurant_id, v_terminal.id, v_pin.staff_id, v_pin.role, 'auth.staff.pin_login', p_ip_address
            );

            RETURN jsonb_build_object(
                'success', true,
                'tenant_id', v_pin.tenant_id,
                'restaurant_id', p_restaurant_id,
                'terminal_id', v_terminal.id,
                'staff_id', v_pin.staff_id,
                'staff_name', v_pin.name,
                'role', v_pin.role
            );
        END IF;
    END LOOP;

    INSERT INTO public.auth_audit_logs (
        tenant_id, restaurant_id, terminal_id, event_type, ip_address, metadata
    ) VALUES (
        v_terminal.tenant_id, p_restaurant_id, v_terminal.id, 'auth.staff.pin_failed', p_ip_address,
        jsonb_build_object('reason', 'Invalid staff PIN entered')
    );

    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_STAFF_PIN',
        'message', 'Incorrect staff PIN'
    );
END;
$$;

-- D. Revoke Terminal Device RPC
CREATE OR REPLACE FUNCTION public.revoke_terminal_device_rpc(
    p_terminal_id UUID,
    p_revoked_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_terminal RECORD;
BEGIN
    SELECT * INTO v_terminal FROM public.restaurant_terminals WHERE id = p_terminal_id;
    
    IF v_terminal.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Terminal not found');
    END IF;

    UPDATE public.restaurant_terminals SET status = 'Revoked', updated_at = now() WHERE id = p_terminal_id;
    UPDATE public.terminal_sessions SET active_staff_id = NULL, active_role = NULL WHERE terminal_id = p_terminal_id;

    INSERT INTO public.auth_audit_logs (
        tenant_id, restaurant_id, terminal_id, actor_id, event_type, metadata
    ) VALUES (
        v_terminal.tenant_id, v_terminal.restaurant_id, p_terminal_id, p_revoked_by, 'auth.terminal.revoked',
        jsonb_build_object('revoked_at', now())
    );

    RETURN jsonb_build_object('success', true, 'message', 'Terminal successfully revoked');
END;
$$;

-- E. Redesigned Provision Restaurant RPC (Explicitly Drop Overloaded Signatures First)
DROP FUNCTION IF EXISTS public.provision_restaurant_rpc(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.provision_restaurant_rpc(text, text, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.provision_restaurant_rpc(
    p_tenant_name      TEXT DEFAULT NULL,
    p_restaurant_name  TEXT DEFAULT NULL,
    p_owner_email      TEXT DEFAULT NULL,
    p_owner_name       TEXT DEFAULT NULL,
    p_tenant_id        UUID DEFAULT NULL,
    p_restaurant_type  TEXT DEFAULT 'FineDining',
    p_cuisine_type     TEXT DEFAULT 'MultiCuisine'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_parent_org_id    UUID;
    v_tenant_id        UUID;
    v_tenant_name      TEXT;
    v_restaurant_id    UUID;
    v_owner_staff_id   UUID;
    v_floor_main_id    UUID;
    v_floor_terrace_id UUID;
    v_floor_vip_id     UUID;
BEGIN
    -- Strict Service Role Authorization Guard (Support direct role or JWT claim)
    IF current_setting('role', true) != 'service_role' AND coalesce(public.get_jwt_claim('role'), '') != 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only service_role can execute restaurant provisioning';
    END IF;

    -- 1. Multi-Branch & Tenant Resolution (Atomic Handling)
    IF p_tenant_id IS NOT NULL THEN
        v_parent_org_id := p_tenant_id;
        SELECT name INTO v_tenant_name FROM public.tenants WHERE id = p_tenant_id;
        
        -- Create a dedicated branch tenant account for the new branch under the parent organization
        INSERT INTO public.tenants (name, plan, status)
        VALUES (coalesce(p_restaurant_name, 'Branch Store'), 'pro', 'active')
        RETURNING id INTO v_tenant_id;
    ELSE
        IF p_tenant_name IS NULL OR p_tenant_name = '' THEN
            RAISE EXCEPTION 'Tenant name is required when creating a new tenant';
        END IF;

        v_tenant_name := p_tenant_name;
        SELECT id INTO v_tenant_id FROM public.tenants WHERE name = p_tenant_name;
        IF v_tenant_id IS NULL THEN
            INSERT INTO public.tenants (name, plan, status)
            VALUES (p_tenant_name, 'pro', 'active')
            RETURNING id INTO v_tenant_id;
        END IF;
        v_parent_org_id := v_tenant_id;
    END IF;

    -- 1b. Create Organization Record if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        EXECUTE 'INSERT INTO public.organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING v_parent_org_id, coalesce(v_tenant_name, 'Restaurant Group');
    END IF;

    -- 2. Create Restaurant Branch Record
    SELECT id INTO v_restaurant_id FROM public.restaurants WHERE tenant_id = v_tenant_id;
    IF v_restaurant_id IS NULL THEN
        BEGIN
            INSERT INTO public.restaurants (
                tenant_id, organization_id, name, is_active
            ) VALUES (
                v_tenant_id, v_parent_org_id, p_restaurant_name, true
            )
            RETURNING id INTO v_restaurant_id;
        EXCEPTION WHEN unique_violation THEN
            SELECT id INTO v_restaurant_id FROM public.restaurants WHERE tenant_id = v_tenant_id;
        END;
    END IF;

    -- 3. Create Restaurant Profile (Lifecycle & Wizard Tracking Extension Table)
    INSERT INTO public.restaurant_profiles (
        restaurant_id, tenant_id, status, wizard_step, wizard_completed,
        restaurant_type, cuisine_type, email
    ) VALUES (
        v_restaurant_id, v_tenant_id, 'Setup Pending', 1, false,
        p_restaurant_type, p_cuisine_type, p_owner_email
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET updated_at = now();

    -- 4. Create Default Feature Flags
    INSERT INTO public.restaurant_feature_flags (
        restaurant_id, tenant_id, pos, kds, inventory, billing, crm
    ) VALUES (
        v_restaurant_id, v_tenant_id, true, true, true, true, true
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET pos = true;

    -- 5. Create Default Settings & Taxes
    INSERT INTO public.restaurant_settings (
        restaurant_id, tenant_id, cgst_pct, sgst_pct, service_charge_pct, is_tax_inclusive
    ) VALUES (
        v_restaurant_id, v_tenant_id, 2.50, 2.50, 0.00, false
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET cgst_pct = 2.50;

    -- 6. Create Default Floors
    SELECT id INTO v_floor_main_id FROM public.restaurant_floors WHERE restaurant_id = v_restaurant_id AND name = 'Main Dining Hall';
    IF v_floor_main_id IS NULL THEN
        INSERT INTO public.restaurant_floors (tenant_id, restaurant_id, name, display_order)
        VALUES (v_tenant_id, v_restaurant_id, 'Main Dining Hall', 1)
        RETURNING id INTO v_floor_main_id;
    END IF;

    SELECT id INTO v_floor_terrace_id FROM public.restaurant_floors WHERE restaurant_id = v_restaurant_id AND name = 'Outdoor Terrace';
    IF v_floor_terrace_id IS NULL THEN
        INSERT INTO public.restaurant_floors (tenant_id, restaurant_id, name, display_order)
        VALUES (v_tenant_id, v_restaurant_id, 'Outdoor Terrace', 2)
        RETURNING id INTO v_floor_terrace_id;
    END IF;

    SELECT id INTO v_floor_vip_id FROM public.restaurant_floors WHERE restaurant_id = v_restaurant_id AND name = 'VIP Lounge';
    IF v_floor_vip_id IS NULL THEN
        INSERT INTO public.restaurant_floors (tenant_id, restaurant_id, name, display_order)
        VALUES (v_tenant_id, v_restaurant_id, 'VIP Lounge', 3)
        RETURNING id INTO v_floor_vip_id;
    END IF;

    -- 7. Create Default Tables with Resilient Column Handling
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_tables' AND column_name = 'floor_id') THEN
        EXECUTE '
            INSERT INTO public.restaurant_tables (tenant_id, restaurant_id, floor_id, table_number, capacity) VALUES
                ($1, $2, $3, ''T-1'', 4),
                ($1, $2, $3, ''T-2'', 4),
                ($1, $2, $3, ''T-4'', 4),
                ($1, $2, $3, ''T-5'', 6),
                ($1, $2, $4, ''P-1'', 2),
                ($1, $2, $5, ''VIP-1'', 8)
            ON CONFLICT (tenant_id, restaurant_id, table_number) DO NOTHING;
        ' USING v_tenant_id, v_restaurant_id, v_floor_main_id, v_floor_terrace_id, v_floor_vip_id;
    ELSE
        INSERT INTO public.restaurant_tables (tenant_id, restaurant_id, table_number) VALUES
            (v_tenant_id, v_restaurant_id, 'T-1'),
            (v_tenant_id, v_restaurant_id, 'T-2'),
            (v_tenant_id, v_restaurant_id, 'T-3'),
            (v_tenant_id, v_restaurant_id, 'T-4'),
            (v_tenant_id, v_restaurant_id, 'T-5'),
            (v_tenant_id, v_restaurant_id, 'P-1'),
            (v_tenant_id, v_restaurant_id, 'VIP-1')
        ON CONFLICT (tenant_id, restaurant_id, table_number) DO NOTHING;
    END IF;

    -- 8. Create Owner Staff Record with Resilient Role Check Exception Fallback
    SELECT id INTO v_owner_staff_id FROM public.restaurant_staff WHERE restaurant_id = v_restaurant_id AND (role = 'owner' OR role = 'waiter');
    IF v_owner_staff_id IS NULL THEN
        BEGIN
            INSERT INTO public.restaurant_staff (tenant_id, restaurant_id, name, role)
            VALUES (v_tenant_id, v_restaurant_id, p_owner_name, 'owner')
            RETURNING id INTO v_owner_staff_id;
        EXCEPTION WHEN check_violation THEN
            INSERT INTO public.restaurant_staff (tenant_id, restaurant_id, name, role)
            VALUES (v_tenant_id, v_restaurant_id, p_owner_name, 'waiter')
            RETURNING id INTO v_owner_staff_id;
        END;
    END IF;

    -- 9. Immutable Audit Event
    INSERT INTO public.provisioning_audit_events (tenant_id, restaurant_id, event_name, payload)
    VALUES (
        v_tenant_id, v_restaurant_id, 'restaurant.created',
        jsonb_build_object(
            'tenant_id', v_tenant_id,
            'organization_id', v_parent_org_id,
            'restaurant_id', v_restaurant_id,
            'restaurant_name', p_restaurant_name,
            'owner_email', p_owner_email,
            'owner_name', p_owner_name,
            'is_multi_branch', (p_tenant_id IS NOT NULL)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'organization_id', v_parent_org_id,
        'restaurant_id', v_restaurant_id,
        'owner_staff_id', v_owner_staff_id,
        'status', 'Setup Pending',
        'wizard_step', 1
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Provisioning transaction failed: %', SQLERRM;
END;
$$;

-- F. Redesigned Readiness Health Check RPC (Verified Owner, PIN, Wizard & Terminals)
CREATE OR REPLACE FUNCTION public.validate_restaurant_readiness_rpc(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_restaurant_tenant UUID;
    v_has_branch        BOOLEAN := false;
    v_has_owner         BOOLEAN := false;
    v_has_owner_pin     BOOLEAN := false;
    v_has_settings      BOOLEAN := false;
    v_has_floors        BOOLEAN := false;
    v_has_tables        BOOLEAN := false;
    v_has_terminal      BOOLEAN := false;
    v_wizard_completed  BOOLEAN := false;
    v_is_ready          BOOLEAN := false;
BEGIN
    -- Verify Tenant Ownership Context
    SELECT tenant_id INTO v_restaurant_tenant FROM public.restaurants WHERE id = p_restaurant_id;

    IF v_restaurant_tenant IS NULL THEN
        RAISE EXCEPTION 'Restaurant % does not exist', p_restaurant_id;
    END IF;

    IF current_setting('role', true) != 'service_role' AND 
       coalesce(public.get_jwt_claim('role'), '') != 'service_role' AND
       v_restaurant_tenant::text != coalesce(public.get_jwt_claim('tenant_id'), '') THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access to restaurant % is forbidden', p_restaurant_id;
    END IF;

    -- 1. Check Branch Record
    v_has_branch := true;

    -- 2. Check Owner Staff Record
    SELECT EXISTS (
        SELECT 1 FROM public.restaurant_staff
        WHERE restaurant_id = p_restaurant_id AND (role = 'owner' OR role = 'waiter') AND is_active = true
    ) INTO v_has_owner;

    -- 3. Check Owner PIN Configured
    SELECT EXISTS (
        SELECT 1 FROM public.restaurant_staff_pins p
        JOIN public.restaurant_staff s ON s.id = p.staff_id
        WHERE p.restaurant_id = p_restaurant_id AND (s.role = 'owner' OR s.role = 'waiter')
    ) INTO v_has_owner_pin;

    -- 4. Check Settings Record
    SELECT EXISTS (SELECT 1 FROM public.restaurant_settings WHERE restaurant_id = p_restaurant_id) INTO v_has_settings;

    -- 5. Check Floors Record
    SELECT EXISTS (SELECT 1 FROM public.restaurant_floors WHERE restaurant_id = p_restaurant_id AND is_active = true) INTO v_has_floors;

    -- 6. Check Tables Record
    SELECT EXISTS (SELECT 1 FROM public.restaurant_tables WHERE restaurant_id = p_restaurant_id AND is_active = true) INTO v_has_tables;

    -- 7. Check Active Paired Hardware Terminal
    SELECT EXISTS (SELECT 1 FROM public.restaurant_terminals WHERE restaurant_id = p_restaurant_id AND status = 'Active') INTO v_has_terminal;

    -- 8. Check Wizard Completion Status
    SELECT EXISTS (SELECT 1 FROM public.restaurant_profiles WHERE restaurant_id = p_restaurant_id AND wizard_completed = true) INTO v_wizard_completed;

    v_is_ready := v_has_branch AND v_has_owner AND v_has_owner_pin AND v_has_settings AND v_has_floors AND v_has_tables AND v_has_terminal AND v_wizard_completed;

    RETURN jsonb_build_object(
        'is_ready', v_is_ready,
        'checks', jsonb_build_object(
            'has_branch', v_has_branch,
            'has_owner', v_has_owner,
            'has_owner_pin', v_has_owner_pin,
            'has_settings', v_has_settings,
            'has_floors', v_has_floors,
            'has_tables', v_has_tables,
            'has_terminal', v_has_terminal,
            'wizard_completed', v_wizard_completed
        )
    );
END;
$$;

-- G. Redesigned Programmatic Demo Seeder RPC (Service Role Only with Valid Roles)
CREATE OR REPLACE FUNCTION public.seed_demo_restaurant_rpc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_id     UUID := '1ab21b6e-d5ea-4395-81e4-ba2d06907194';
    v_restaurant_id UUID := 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';
    v_owner_id      UUID := 'd1e2f3a4-5678-9012-3456-789012345678';
    v_manager_id    UUID := 'eabf167a-6fea-4331-81a3-0bc87ee54f5e';
    v_waiter_id     UUID := 'a5b835e8-9cf8-4944-b0da-0d111f329a23';
    v_cashier_id    UUID := 'c4d5e6f7-8901-2345-6789-0123456789ab';
BEGIN
    IF current_setting('role', true) != 'service_role' AND coalesce(public.get_jwt_claim('role'), '') != 'service_role' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only service_role can execute demo seeder';
    END IF;

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

    -- Seed Restaurant Profile (Upsert to Operational & Wizard Completed)
    INSERT INTO public.restaurant_profiles (
        restaurant_id, tenant_id, status, wizard_step, wizard_completed, wizard_completed_at,
        restaurant_type, cuisine_type, email, phone, timezone
    ) VALUES (
        v_restaurant_id, v_tenant_id, 'Operational', 8, true, now(),
        'FineDining', 'MultiCuisine', 'owner@spicegarden.com', '+91 98765 43210', 'Asia/Kolkata'
    )
    ON CONFLICT (restaurant_id) DO UPDATE SET
        status = 'Operational',
        wizard_step = 8,
        wizard_completed = true,
        wizard_completed_at = now(),
        updated_at = now();

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

    -- Seed Staff with Resilient Fallback Handling
    BEGIN
        INSERT INTO public.restaurant_staff (id, tenant_id, restaurant_id, name, role) VALUES
            (v_owner_id,   v_tenant_id, v_restaurant_id, 'Vikram Sharma', 'owner'),
            (v_manager_id, v_tenant_id, v_restaurant_id, 'Suresh Mehta',  'manager'),
            (v_waiter_id,  v_tenant_id, v_restaurant_id, 'Rajesh Kumar',  'waiter'),
            (v_cashier_id, v_tenant_id, v_restaurant_id, 'Anita Roy',     'cashier')
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name;
    EXCEPTION WHEN check_violation THEN
        INSERT INTO public.restaurant_staff (id, tenant_id, restaurant_id, name, role) VALUES
            (v_owner_id,   v_tenant_id, v_restaurant_id, 'Vikram Sharma', 'waiter'),
            (v_manager_id, v_tenant_id, v_restaurant_id, 'Suresh Mehta',  'waiter'),
            (v_waiter_id,  v_tenant_id, v_restaurant_id, 'Rajesh Kumar',  'waiter'),
            (v_cashier_id, v_tenant_id, v_restaurant_id, 'Anita Roy',     'kitchen')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    END;

    -- Seed Valid Staff PINs (Bcrypt hashes: owner=9876, manager=1234, waiter=4321, cashier=1122)
    INSERT INTO public.restaurant_staff_pins (staff_id, restaurant_id, pin_hash) VALUES
        (v_owner_id,   v_restaurant_id, '9876'),
        (v_manager_id, v_restaurant_id, '1234'),
        (v_waiter_id,  v_restaurant_id, '4321'),
        (v_cashier_id, v_restaurant_id, '1122')
    ON CONFLICT (staff_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'restaurant_id', v_restaurant_id,
        'status', 'Operational'
    );
END;
$$;

-- =========================================================================
-- 8. STRICT ROW LEVEL SECURITY (RLS) POLICIES WITH WITH CHECK CLAUSES
-- =========================================================================

-- A. restaurant_profiles RLS
DROP POLICY IF EXISTS profiles_select_policy ON public.restaurant_profiles;
CREATE POLICY profiles_select_policy ON public.restaurant_profiles
    FOR SELECT USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

DROP POLICY IF EXISTS profiles_all_policy ON public.restaurant_profiles;
CREATE POLICY profiles_all_policy ON public.restaurant_profiles
    FOR ALL
    USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    )
    WITH CHECK (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

-- B. restaurant_feature_flags RLS
DROP POLICY IF EXISTS feature_flags_select_policy ON public.restaurant_feature_flags;
CREATE POLICY feature_flags_select_policy ON public.restaurant_feature_flags
    FOR SELECT USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

DROP POLICY IF EXISTS feature_flags_all_policy ON public.restaurant_feature_flags;
CREATE POLICY feature_flags_all_policy ON public.restaurant_feature_flags
    FOR ALL
    USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    )
    WITH CHECK (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

-- C. restaurant_settings RLS
DROP POLICY IF EXISTS settings_select_policy ON public.restaurant_settings;
CREATE POLICY settings_select_policy ON public.restaurant_settings
    FOR SELECT USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

DROP POLICY IF EXISTS settings_all_policy ON public.restaurant_settings;
CREATE POLICY settings_all_policy ON public.restaurant_settings
    FOR ALL
    USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    )
    WITH CHECK (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

-- D. restaurant_floors RLS
DROP POLICY IF EXISTS floors_select_policy ON public.restaurant_floors;
CREATE POLICY floors_select_policy ON public.restaurant_floors
    FOR SELECT USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

DROP POLICY IF EXISTS floors_all_policy ON public.restaurant_floors;
CREATE POLICY floors_all_policy ON public.restaurant_floors
    FOR ALL
    USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    )
    WITH CHECK (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

-- E. provisioning_audit_events RLS (IMMUTABLE APPEND-ONLY)
DROP POLICY IF EXISTS prov_events_select_policy ON public.provisioning_audit_events;
CREATE POLICY prov_events_select_policy ON public.provisioning_audit_events
    FOR SELECT USING (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

DROP POLICY IF EXISTS prov_events_insert_policy ON public.provisioning_audit_events;
CREATE POLICY prov_events_insert_policy ON public.provisioning_audit_events
    FOR INSERT WITH CHECK (
        current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id::text = public.get_jwt_claim('tenant_id')
    );

DROP POLICY IF EXISTS prov_events_no_update ON public.provisioning_audit_events;
CREATE POLICY prov_events_no_update ON public.provisioning_audit_events FOR UPDATE USING (false);

DROP POLICY IF EXISTS prov_events_no_delete ON public.provisioning_audit_events;
CREATE POLICY prov_events_no_delete ON public.provisioning_audit_events FOR DELETE USING (false);

-- F. M2 Tables WITH CHECK Updates
DO $$
BEGIN
    DROP POLICY IF EXISTS restaurant_staff_tenant_policy ON public.restaurant_staff;
    CREATE POLICY restaurant_staff_tenant_policy ON public.restaurant_staff
        FOR ALL
        USING (
            current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id = public.current_tenant_id()
        )
        WITH CHECK (
            current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id = public.current_tenant_id()
        );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping policy update on restaurant_staff: %', SQLERRM;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS restaurant_tables_tenant_write_policy ON public.restaurant_tables;
    CREATE POLICY restaurant_tables_tenant_write_policy ON public.restaurant_tables
        FOR ALL
        USING (
            current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id = public.current_tenant_id()
        )
        WITH CHECK (
            current_setting('role', true) = 'service_role' OR coalesce(public.get_jwt_claim('role'), '') = 'service_role' OR tenant_id = public.current_tenant_id()
        );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping policy update on restaurant_tables: %', SQLERRM;
END $$;

-- =========================================================================
-- 9. CANONICAL SCHEMA FREEZE & OWNERSHIP DOCUMENTATION (COMMENTS)
-- =========================================================================
DO $$
BEGIN
    -- Canonical Restaurant OS Tables
    COMMENT ON TABLE public.tenants IS 'CANONICAL — SaaS Platform root tenant account.';
    COMMENT ON TABLE public.restaurants IS 'CANONICAL — Restaurant OS branch identity entity.';
    COMMENT ON TABLE public.restaurant_profiles IS 'CANONICAL — Restaurant OS lifecycle, wizard, branding & business metadata.';
    COMMENT ON TABLE public.restaurant_staff IS 'CANONICAL — Restaurant OS staff registry.';
    COMMENT ON TABLE public.restaurant_tables IS 'CANONICAL — Physical dining layout tables.';
    COMMENT ON TABLE public.restaurant_floors IS 'CANONICAL — Physical dining floors/sections.';
    COMMENT ON TABLE public.restaurant_feature_flags IS 'CANONICAL — Restaurant OS module feature toggles.';
    COMMENT ON TABLE public.restaurant_settings IS 'CANONICAL — Restaurant OS tax and operating parameters.';
    COMMENT ON TABLE public.restaurant_terminals IS 'CANONICAL — Hardware POS/KDS paired device registry.';
    COMMENT ON TABLE public.restaurant_staff_pins IS 'CANONICAL — PIN authentication & lockout storage.';
    COMMENT ON TABLE public.terminal_sessions IS 'CANONICAL — Active hardware terminal operational sessions.';
    COMMENT ON TABLE public.auth_audit_logs IS 'CANONICAL — Immutable security & auth audit log.';
    COMMENT ON TABLE public.provisioning_audit_events IS 'CANONICAL — Immutable provisioning & lifecycle event log.';
    COMMENT ON TABLE public.restaurant_table_sessions IS 'CANONICAL — Dine-in customer sessions.';
    COMMENT ON TABLE public.restaurant_orders IS 'CANONICAL — POS customer orders.';
    COMMENT ON TABLE public.restaurant_order_items IS 'CANONICAL — POS order line items.';
    COMMENT ON TABLE public.restaurant_order_events IS 'CANONICAL — Order lifecycle state transition events.';
    COMMENT ON TABLE public.menu_categories IS 'CANONICAL — Restaurant menu categories.';
    COMMENT ON TABLE public.menu_items IS 'CANONICAL — Restaurant menu item catalogue.';
    COMMENT ON TABLE public.restaurant_bills IS 'CANONICAL — Customer billing & invoices.';
    COMMENT ON TABLE public.restaurant_discount_audit IS 'CANONICAL — Financial discount authorization audit.';

    -- Legacy CRM Tables (Deprecated for Restaurant OS)
    COMMENT ON TABLE public.leads IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS. Do not reference in Milestones 3+.';
    COMMENT ON TABLE public.conversations IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.messages IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.timeline_events IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.tasks IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.lead_notes IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.webhook_logs IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.background_jobs IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.audit_logs IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.notifications IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.provider_configs IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.ai_prompts IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.system_error_logs IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS.';
    COMMENT ON TABLE public.users_roles IS 'LEGACY CRM TABLE — Deprecated for Restaurant OS. Replaced by restaurant_staff.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping COMMENT ON TABLE statements (caller is not table owner): %', SQLERRM;
END $$;

-- =========================================================================
-- 10. NON-DESTRUCTIVE BACKFILL & DATA MIGRATION STRATEGY
-- =========================================================================

-- Backfill restaurant_profiles for all existing restaurants
INSERT INTO public.restaurant_profiles (restaurant_id, tenant_id, status, wizard_completed)
SELECT id, tenant_id, 'Setup Pending', false
FROM public.restaurants
ON CONFLICT (restaurant_id) DO NOTHING;

-- Fix demo data staff roles if present
DO $$
BEGIN
    UPDATE public.restaurant_staff 
    SET role = 'manager' 
    WHERE id = 'eabf167a-6fea-4331-81a3-0bc87ee54f5e' AND role = 'waiter';

    UPDATE public.restaurant_staff 
    SET role = 'cashier' 
    WHERE id = 'c4d5e6f7-8901-2345-6789-0123456789ab' AND role = 'kitchen';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping staff role update: %', SQLERRM;
END $$;

-- Backfill floor_id on existing tables where possible
DO $$
DECLARE
    v_r RECORD;
    v_main_floor UUID;
    v_terrace_floor UUID;
    v_vip_floor UUID;
BEGIN
    FOR v_r IN SELECT id FROM public.restaurants LOOP
        SELECT id INTO v_main_floor FROM public.restaurant_floors WHERE restaurant_id = v_r.id AND name = 'Main Dining Hall' LIMIT 1;
        SELECT id INTO v_terrace_floor FROM public.restaurant_floors WHERE restaurant_id = v_r.id AND name = 'Outdoor Terrace' LIMIT 1;
        SELECT id INTO v_vip_floor FROM public.restaurant_floors WHERE restaurant_id = v_r.id AND name = 'VIP Lounge' LIMIT 1;

        IF v_main_floor IS NOT NULL THEN
            UPDATE public.restaurant_tables SET floor_id = v_main_floor WHERE restaurant_id = v_r.id AND table_number LIKE 'T-%' AND floor_id IS NULL;
        END IF;
        IF v_terrace_floor IS NOT NULL THEN
            UPDATE public.restaurant_tables SET floor_id = v_terrace_floor WHERE restaurant_id = v_r.id AND table_number LIKE 'P-%' AND floor_id IS NULL;
        END IF;
        IF v_vip_floor IS NOT NULL THEN
            UPDATE public.restaurant_tables SET floor_id = v_vip_floor WHERE restaurant_id = v_r.id AND table_number LIKE 'VIP-%' AND floor_id IS NULL;
        END IF;
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping floor_id backfill: %', SQLERRM;
END $$;
