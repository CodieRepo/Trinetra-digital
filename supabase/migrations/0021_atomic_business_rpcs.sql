-- =========================================================================
-- Trinetra Restaurant OS — Phase S5 Atomic Business Logic RPCs
-- Migration file: 0021_atomic_business_rpcs.sql
-- Description: Atomic PostgreSQL RPCs for concurrency control, session locking,
--              atomic order placement, and row-locked status transitions.
-- =========================================================================

-- 1. Atomic Customer Order Placement (Prevents TOCTOU session duplication & price tampering)
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
    SELECT id, tenant_id, restaurant_id, is_active INTO v_table
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

    -- 6. Insert Order Event
    INSERT INTO public.restaurant_order_events (
        tenant_id, order_id, from_status, to_status, actor_role, actor_id, created_at
    ) VALUES (
        v_table.tenant_id, v_order_id, NULL, 'placed', 'customer', p_session_token, now()
    );

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

-- 2. Atomic Order Status Transition with FOR UPDATE Row Locking
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

    RETURN jsonb_build_object('success', true, 'status', p_next_status);
END;
$$;
