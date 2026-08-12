-- =========================================================================
-- Trinetra Restaurant OS — Milestone 3.1 Hardening Migration
-- Migration file: 0023_notification_outbox.sql
-- Description: Transactional Notification Outbox, row-locked batch claiming,
--              outbox insertion inside atomic order RPCs, and distributed
--              IP-level sliding window rate limiting for staff PIN login.
-- =========================================================================

-- 1. Transactional Notification Outbox Table
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL DEFAULT 'order',
    aggregate_id UUID NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending 
ON public.notification_outbox(status, available_at) 
WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_notification_outbox_tenant 
ON public.notification_outbox(tenant_id, restaurant_id);

-- Security: Internal server access only
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_outbox_service_policy"
ON public.notification_outbox
FOR ALL
USING (auth.role() = 'service_role');

-- 2. Atomic Outbox Job Claiming RPC (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_notification_outbox_batch_rpc(
    p_batch_size INT DEFAULT 10,
    p_worker_id TEXT DEFAULT 'worker_1',
    p_lease_seconds INT DEFAULT 60
)
RETURNS TABLE (
    outbox_id UUID,
    tenant_id UUID,
    restaurant_id UUID,
    event_type TEXT,
    aggregate_id UUID,
    idempotency_key TEXT,
    payload JSONB,
    attempts INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    WITH pending_jobs AS (
        SELECT id
        FROM public.notification_outbox
        WHERE (status = 'pending' AND available_at <= now())
           OR (status = 'processing' AND locked_at <= now() - (p_lease_seconds || ' seconds')::INTERVAL AND attempts < max_attempts)
        ORDER BY created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.notification_outbox o
    SET status = 'processing',
        locked_at = now(),
        locked_by = p_worker_id,
        attempts = o.attempts + 1
    FROM pending_jobs pj
    WHERE o.id = pj.id
    RETURNING o.id, o.tenant_id, o.restaurant_id, o.event_type, o.aggregate_id, o.idempotency_key, o.payload, o.attempts;
END;
$$;

-- 3. Upgrade create_customer_order_atomic_rpc with Transactional Outbox Event Insertion
CREATE OR REPLACE FUNCTION public.create_customer_order_atomic_rpc(
    p_table_token TEXT,
    p_session_token TEXT,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_table RECORD;
    v_session RECORD;
    v_order_id UUID;
    v_total_amount NUMERIC := 0;
    v_item JSONB;
    v_db_item RECORD;
    v_qty INT;
    v_price NUMERIC;
BEGIN
    -- 1. Lock table record
    SELECT id, tenant_id, restaurant_id, table_number, is_active INTO v_table
    FROM public.restaurant_tables
    WHERE table_token = p_table_token
    FOR SHARE;

    IF v_table.id IS NULL OR v_table.is_active = false THEN
        RETURN jsonb_build_object('success', false, 'error', 'Table not found or inactive');
    END IF;

    -- 2. Upsert active table session atomically
    SELECT id, payment_status, status INTO v_session
    FROM public.restaurant_table_sessions
    WHERE table_id = v_table.id AND session_token = p_session_token AND status = 'active'
    ORDER BY opened_at DESC LIMIT 1
    FOR UPDATE;

    IF v_session.id IS NOT NULL THEN
        IF v_session.payment_status = 'paid' THEN
            RETURN jsonb_build_object('success', false, 'session_paid', true, 'error', 'Bill settled. No new orders allowed.');
        END IF;
    ELSE
        INSERT INTO public.restaurant_table_sessions (
            tenant_id, restaurant_id, table_id, session_token, status, payment_status, opened_at
        ) VALUES (
            v_table.tenant_id, v_table.restaurant_id, v_table.id, p_session_token, 'active', 'unpaid', now()
        )
        RETURNING id, payment_status, status INTO v_session;
    END IF;

    -- 3. Calculate total amount & validate items from DB prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'quantity')::INT;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be a positive integer';
        END IF;

        SELECT id, name, price, is_available INTO v_db_item
        FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND tenant_id = v_table.tenant_id;

        IF v_db_item.id IS NULL OR v_db_item.is_available = false THEN
            RAISE EXCEPTION 'Item % is currently unavailable', COALESCE(v_db_item.name, v_item->>'menu_item_id');
        END IF;

        v_price := (v_db_item.price)::NUMERIC;
        v_total_amount := v_total_amount + (v_price * v_qty);
    END LOOP;

    -- 4. Create Order
    INSERT INTO public.restaurant_orders (
        tenant_id, restaurant_id, table_id, table_session_id, session_token, status, notes, total_amount, created_at, updated_at
    ) VALUES (
        v_table.tenant_id, v_table.restaurant_id, v_table.id, v_session.id, p_session_token, 'placed', p_notes, v_total_amount, now(), now()
    )
    RETURNING id INTO v_order_id;

    -- 5. Create Order Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'quantity')::INT;
        SELECT id, name, price INTO v_db_item
        FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID;

        INSERT INTO public.restaurant_order_items (
            tenant_id, order_id, menu_item_id, name, price, quantity, notes
        ) VALUES (
            v_table.tenant_id, v_order_id, v_db_item.id, v_db_item.name, (v_db_item.price)::NUMERIC, v_qty, v_item->>'notes'
        );
    END LOOP;

    -- 6. Insert Order Audit Event
    INSERT INTO public.restaurant_order_events (
        tenant_id, order_id, from_status, to_status, actor_role, actor_id, created_at
    ) VALUES (
        v_table.tenant_id, v_order_id, NULL, 'placed', 'customer', p_session_token, now()
    );

    -- 7. Transactional Outbox Event Insertion (Same PostgreSQL Transaction)
    INSERT INTO public.notification_outbox (
        tenant_id, restaurant_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload, status
    ) VALUES (
        v_table.tenant_id, v_table.restaurant_id, 'order_created', 'order', v_order_id,
        'order_' || v_order_id::TEXT || '_placed_fcm',
        jsonb_build_object(
            'order_id', v_order_id,
            'table_session_id', v_session.id,
            'table_number', COALESCE(v_table.table_number, 'Direct'),
            'status', 'placed',
            'total_amount', v_total_amount,
            'created_at', now()
        ),
        'pending'
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'table_session_id', v_session.id,
        'total_amount', v_total_amount
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Upgrade transition_order_status_atomic_rpc with Transactional Outbox Insertion
CREATE OR REPLACE FUNCTION public.transition_order_status_atomic_rpc(
    p_order_id UUID,
    p_next_status TEXT,
    p_actor_staff_id UUID,
    p_actor_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_order RECORD;
    v_valid_transition BOOLEAN := false;
BEGIN
    -- 1. Lock order row for update
    SELECT * INTO v_order
    FROM public.restaurant_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Role transition permissions check
    IF p_actor_role = 'kitchen' AND p_next_status IN ('served', 'closed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kitchen role cannot mark orders as served or closed');
    END IF;
    IF p_actor_role = 'waiter' AND p_next_status IN ('accepted', 'preparing') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Waiter role cannot mark orders as accepted or preparing');
    END IF;

    -- 3. State Machine transition validation
    IF v_order.status = p_next_status THEN
        RETURN jsonb_build_object('success', true, 'status', p_next_status, 'message', 'Status already set');
    END IF;

    IF (v_order.status = 'placed' AND p_next_status IN ('accepted', 'cancelled')) OR
       (v_order.status = 'accepted' AND p_next_status IN ('preparing', 'cancelled')) OR
       (v_order.status = 'preparing' AND p_next_status IN ('ready', 'cancelled')) OR
       (v_order.status = 'ready' AND p_next_status IN ('served', 'cancelled')) OR
       (v_order.status = 'served' AND p_next_status IN ('closed', 'cancelled')) THEN
        v_valid_transition := true;
    END IF;

    IF NOT v_valid_transition THEN
        RETURN jsonb_build_object('success', false, 'error', format('Invalid status transition from %s to %s', v_order.status, p_next_status));
    END IF;

    -- 4. Execute atomic update
    UPDATE public.restaurant_orders
    SET status = p_next_status, updated_at = now()
    WHERE id = p_order_id;

    -- 5. Record audit event
    INSERT INTO public.restaurant_order_events (
        tenant_id, order_id, from_status, to_status, actor_role, actor_id, created_at
    ) VALUES (
        v_order.tenant_id, v_order.id, v_order.status, p_next_status, p_actor_role, p_actor_staff_id::TEXT, now()
    );

    -- 6. Transactional Outbox Insertion (Same Transaction)
    INSERT INTO public.notification_outbox (
        tenant_id, restaurant_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload, status
    ) VALUES (
        v_order.tenant_id, v_order.restaurant_id, 'order_status_changed', 'order', v_order.id,
        'order_' || v_order.id::TEXT || '_' || p_next_status || '_fcm',
        jsonb_build_object(
            'order_id', v_order.id,
            'from_status', v_order.status,
            'status', p_next_status,
            'actor_role', p_actor_role,
            'updated_at', now()
        ),
        'pending'
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'status', p_next_status);
END;
$$;

-- 5. Staff Login IP Rate Limiting Table & RPCs
CREATE TABLE IF NOT EXISTS public.staff_login_ip_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_login_ip ON public.staff_login_ip_rate_limits(ip_address, attempted_at);

-- Check IP rate limit (Max 10 failed login attempts per IP per 15 minutes)
CREATE OR REPLACE FUNCTION public.check_ip_login_rate_limit_rpc(
    p_ip_address TEXT,
    p_max_attempts INT DEFAULT 10,
    p_window_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_recent_attempts INT;
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := now() - (p_window_minutes || ' minutes')::INTERVAL;

    -- Cleanup old entries
    DELETE FROM public.staff_login_ip_rate_limits WHERE attempted_at < v_cutoff;

    -- Count recent attempts for this IP
    SELECT COUNT(*) INTO v_recent_attempts
    FROM public.staff_login_ip_rate_limits
    WHERE ip_address = p_ip_address AND attempted_at >= v_cutoff;

    IF v_recent_attempts >= p_max_attempts THEN
        RETURN jsonb_build_object('allowed', false, 'attempts', v_recent_attempts, 'retry_after_seconds', 900);
    END IF;

    RETURN jsonb_build_object('allowed', true, 'attempts', v_recent_attempts);
END;
$$;

-- Record failed IP login attempt
CREATE OR REPLACE FUNCTION public.record_failed_ip_login_rpc(
    p_ip_address TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    INSERT INTO public.staff_login_ip_rate_limits (ip_address, attempted_at)
    VALUES (p_ip_address, now());
END;
$$;
