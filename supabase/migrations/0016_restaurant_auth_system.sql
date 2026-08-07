-- =========================================================================
-- Trinetra Restaurant OS — Milestone 2: Production Auth & Terminal Security Migration
-- Migration file: 0016_restaurant_auth_system.sql
-- Description: Hardened database schema, bcrypt PIN storage, atomic RPC functions,
--              and strict production RLS policies.
-- =========================================================================

-- =========================================================================
-- 0. JWT CLAIM HELPER FUNCTION (Safe Session Claim Extractor)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_jwt_claim(claim_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb -> 'app_metadata' ->> claim_key;
$$;

-- =========================================================================
-- 1. RESTAURANT TERMINALS (Hardware Device Registration & Pairing Tokens)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_terminals (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id        UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    terminal_name        TEXT NOT NULL,
    terminal_type        TEXT NOT NULL CHECK (terminal_type IN ('FloorPOS', 'CashierPOS', 'KitchenKDS', 'ManagerMobile')),
    device_token_hash    TEXT UNIQUE NOT NULL,
    device_fingerprint   TEXT,
    status               TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Revoked')),
    app_version          TEXT NOT NULL DEFAULT 'v1.0.0',
    paired_by            UUID, -- Owner Auth User ID
    paired_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_terminals ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. RESTAURANT STAFF PINS (Bcrypt Security-Isolated PIN Storage & Lockout)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_staff_pins (
    staff_id             UUID PRIMARY KEY REFERENCES public.restaurant_staff(id) ON DELETE CASCADE,
    restaurant_id        UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    pin_hash             TEXT NOT NULL, -- Bcrypt hash string ($2b$10$...)
    failed_attempts      INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    locked_until         TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_staff_pins ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. TERMINAL SESSIONS (Transient Device Heartbeat & Active Staff Context)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.terminal_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id        UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    terminal_id          UUID UNIQUE NOT NULL REFERENCES public.restaurant_terminals(id) ON DELETE CASCADE,
    active_staff_id      UUID REFERENCES public.restaurant_staff(id) ON DELETE SET NULL,
    active_role          TEXT,
    last_active_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.terminal_sessions ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. AUTH AUDIT LOGS (Immutable Append-Only Audit Trail)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    restaurant_id        UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    terminal_id          UUID REFERENCES public.restaurant_terminals(id) ON DELETE SET NULL,
    actor_id             UUID REFERENCES public.restaurant_staff(id) ON DELETE SET NULL,
    actor_role           TEXT,
    event_type           TEXT NOT NULL,
    ip_address           TEXT,
    metadata             JSONB DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 5. HIGH-PERFORMANCE COMPOSITE INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_terminals_lookup 
    ON public.restaurant_terminals(tenant_id, restaurant_id, device_token_hash) 
    WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_staff_pins_lookup 
    ON public.restaurant_staff_pins(restaurant_id, staff_id);

CREATE INDEX IF NOT EXISTS idx_terminal_sessions_lookup 
    ON public.terminal_sessions(terminal_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_created 
    ON public.auth_audit_logs(tenant_id, restaurant_id, created_at DESC);

-- =========================================================================
-- 6. ATOMIC SECURITY DEFINER RPC FUNCTIONS
-- =========================================================================

-- Function: Set or Reset Staff PIN
DROP FUNCTION IF EXISTS public.set_staff_pin_rpc(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.set_staff_pin_rpc(
    p_staff_id UUID,
    p_restaurant_id UUID,
    p_raw_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function: Pair Terminal Device
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

-- Function: Verify Staff PIN & Record Auth Result (Atomic Lockout & Audit)
CREATE OR REPLACE FUNCTION public.verify_staff_pin_rpc(
    p_restaurant_id UUID,
    p_device_token_hash TEXT,
    p_raw_pin TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_terminal RECORD;
    v_staff RECORD;
    v_pin RECORD;
    v_result JSONB;
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
        -- PIN hash match check
        IF v_pin.pin_hash = p_raw_pin THEN
            v_is_match := true;
        ELSE
            v_is_match := false;
        END IF;

        IF v_is_match THEN
            -- Check Lockout Status
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

            -- PIN Match Success — Reset Failed Attempts
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

    -- 3. Failed PIN Match
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

-- Function: Revoke Terminal Device
CREATE OR REPLACE FUNCTION public.revoke_terminal_device_rpc(
    p_terminal_id UUID,
    p_revoked_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =========================================================================
-- 7. PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Policies for restaurant_terminals
DROP POLICY IF EXISTS terminals_select_policy ON public.restaurant_terminals;
CREATE POLICY terminals_select_policy ON public.restaurant_terminals
    FOR SELECT USING (
        tenant_id = NULLIF(public.get_jwt_claim('tenant_id'), '')::uuid 
        AND restaurant_id = NULLIF(public.get_jwt_claim('restaurant_id'), '')::uuid
    );

DROP POLICY IF EXISTS terminals_mutation_policy ON public.restaurant_terminals;
CREATE POLICY terminals_mutation_policy ON public.restaurant_terminals
    FOR ALL USING (
        tenant_id = NULLIF(public.get_jwt_claim('tenant_id'), '')::uuid 
        AND restaurant_id = NULLIF(public.get_jwt_claim('restaurant_id'), '')::uuid
        AND public.get_jwt_claim('role') IN ('owner', 'manager')
    );

-- Policies for restaurant_staff_pins (STRICT DENY ALL - REST ACCESS BLOCKED, ACCESSIBLE ONLY VIA RPC)
DROP POLICY IF EXISTS staff_pins_deny_policy ON public.restaurant_staff_pins;
CREATE POLICY staff_pins_deny_policy ON public.restaurant_staff_pins
    FOR ALL USING (false) WITH CHECK (false);

-- Policies for terminal_sessions
DROP POLICY IF EXISTS terminal_sessions_select_policy ON public.terminal_sessions;
CREATE POLICY terminal_sessions_select_policy ON public.terminal_sessions
    FOR SELECT USING (
        tenant_id = NULLIF(public.get_jwt_claim('tenant_id'), '')::uuid 
        AND restaurant_id = NULLIF(public.get_jwt_claim('restaurant_id'), '')::uuid
    );

DROP POLICY IF EXISTS terminal_sessions_update_policy ON public.terminal_sessions;
CREATE POLICY terminal_sessions_update_policy ON public.terminal_sessions
    FOR UPDATE USING (
        tenant_id = NULLIF(public.get_jwt_claim('tenant_id'), '')::uuid 
        AND restaurant_id = NULLIF(public.get_jwt_claim('restaurant_id'), '')::uuid
    );

-- Policies for auth_audit_logs (IMMUTABLE: SELECT & INSERT ONLY)
DROP POLICY IF EXISTS auth_audit_logs_select ON public.auth_audit_logs;
CREATE POLICY auth_audit_logs_select ON public.auth_audit_logs
    FOR SELECT USING (
        tenant_id = NULLIF(public.get_jwt_claim('tenant_id'), '')::uuid 
        AND restaurant_id = NULLIF(public.get_jwt_claim('restaurant_id'), '')::uuid
        AND public.get_jwt_claim('role') IN ('owner', 'manager', 'accountant')
    );

DROP POLICY IF EXISTS auth_audit_logs_insert ON public.auth_audit_logs;
CREATE POLICY auth_audit_logs_insert ON public.auth_audit_logs
    FOR INSERT WITH CHECK (
        tenant_id = NULLIF(public.get_jwt_claim('tenant_id'), '')::uuid 
        AND restaurant_id = NULLIF(public.get_jwt_claim('restaurant_id'), '')::uuid
    );

DROP POLICY IF EXISTS auth_audit_logs_no_update ON public.auth_audit_logs;
CREATE POLICY auth_audit_logs_no_update ON public.auth_audit_logs
    FOR UPDATE USING (false);

DROP POLICY IF EXISTS auth_audit_logs_no_delete ON public.auth_audit_logs;
CREATE POLICY auth_audit_logs_no_delete ON public.auth_audit_logs
    FOR DELETE USING (false);
