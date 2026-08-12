-- =========================================================================
-- Trinetra Restaurant OS — Phase S1 Security Auth Hardening Migration
-- Migration file: 0019_security_auth_hardening.sql
-- Description: Enables pgcrypto, upgrades verify_staff_pin_rpc with Bcrypt
--              and backwards-compatible seed matching, updates set_staff_pin_rpc
--              to use salted Bcrypt hashing, pins search_path for SECURITY DEFINER
--              functions, and adds audit trail functions.
-- =========================================================================

-- 1. Enable pgcrypto extension for secure server-side password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Hardened verify_staff_pin_rpc with Bcrypt + Seed Fallback
CREATE OR REPLACE FUNCTION public.verify_staff_pin_rpc(
    p_restaurant_id UUID,
    p_device_token_hash TEXT,
    p_raw_pin TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

    -- 2. Find Staff Members for Branch and evaluate PINs safely
    FOR v_pin IN 
        SELECT p.*, s.tenant_id, s.name, s.role, s.is_active
        FROM public.restaurant_staff_pins p
        JOIN public.restaurant_staff s ON s.id = p.staff_id
        WHERE p.restaurant_id = p_restaurant_id AND s.is_active = true
        FOR UPDATE OF p
    LOOP
        v_is_match := false;

        -- Check Bcrypt match if pin_hash is a Bcrypt hash ($2a$ or $2b$)
        IF v_pin.pin_hash LIKE '$2a$%' OR v_pin.pin_hash LIKE '$2b$%' THEN
            IF extensions.crypt(p_raw_pin, v_pin.pin_hash) = v_pin.pin_hash THEN
                v_is_match := true;
            END IF;
        -- Backwards-compatible check for legacy plaintext / SHA-256 seed PINs
        ELSIF v_pin.pin_hash = p_raw_pin OR v_pin.pin_hash = encode(digest(p_raw_pin, 'sha256'), 'hex') THEN
            v_is_match := true;
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

-- 3. Hardened set_staff_pin_rpc using Bcrypt hashing
CREATE OR REPLACE FUNCTION public.set_staff_pin_rpc(
    p_staff_id UUID,
    p_restaurant_id UUID,
    p_raw_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_bcrypt_hash TEXT;
BEGIN
    IF length(p_raw_pin) < 4 OR length(p_raw_pin) > 8 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'PIN must be between 4 and 8 digits'
        );
    END IF;

    -- Generate Bcrypt hash with salt factor 10
    v_bcrypt_hash := extensions.crypt(p_raw_pin, extensions.gen_salt('bf', 10));

    INSERT INTO public.restaurant_staff_pins (
        staff_id, restaurant_id, pin_hash, updated_at
    ) VALUES (
        p_staff_id, p_restaurant_id, v_bcrypt_hash, now()
    )
    ON CONFLICT (staff_id) DO UPDATE SET 
        pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Staff PIN updated securely'
    );
END;
$$;
